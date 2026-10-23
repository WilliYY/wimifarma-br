"""Prepare auditable CMED-reference manifests without writing catalog data."""

import argparse
from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile


SOURCE_SHA256 = "5febea16f9d08f2dbdcf15e954a05b762a7650e834d050c4d57b2dcb4b448fa3"
SOURCE_URL = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/lista_pmc__20261009_115232671.xlsx/@@download/file"
PUBLISHED_ON = "2026-10-09"
MAX_CENTS = 100_000_000
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
PMC_LABEL = re.compile(r"^PMC\s+(?:Sem\s+Impostos|(?:\d|[1-9]\d)(?:[.,]\d{1,2})?\s*%(?:\s+ALC)?)$", re.I)
REGULAR_PMC = re.compile(r"^PMC\s+(?:\d|[1-9]\d)(?:[.,]\d{1,2})?\s*%$", re.I)


def normalize_gtin(value):
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not re.fullmatch(r"(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})", value):
        return None
    total = sum(int(digit) * (3 if index % 2 == 0 else 1) for index, digit in enumerate(reversed(value[:-1])))
    return value.zfill(14) if (-total) % 10 == int(value[-1]) else None


def price_cents(value):
    """Parse source decimal text exactly; never round a fractional cent."""
    if not isinstance(value, str):
        raise ValueError("Invalid PMC monetary type")
    value = value.strip()
    if value in ("", "-", "--"):
        return None
    if re.fullmatch(r"(?:[0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+),[0-9]{1,2}", value):
        normalized = value.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"[0-9]+(?:\.[0-9]{1,2})?", value):
        normalized = value
    else:
        raise ValueError("Invalid PMC monetary text")
    try:
        cents = Decimal(normalized) * 100
    except InvalidOperation as error:
        raise ValueError("Invalid PMC monetary text") from error
    if not cents.is_finite() or cents != cents.to_integral_value() or not 0 <= cents <= MAX_CENTS:
        raise ValueError("PMC amount out of range")
    return int(cents)


def utc_iso(value):
    """PostgreSQL timestamp-without-zone snapshots are UTC; JS CAS uses milliseconds."""
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})?", value):
        raise ValueError("Invalid ISO timestamp")
    instant = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=timezone.utc)
    return instant.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def verify_source(path):
    with Path(path).open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != SOURCE_SHA256:
        raise ValueError(f"CMED SHA-256 mismatch: expected {SOURCE_SHA256}, received {digest}")
    return digest


def iter_sheet_rows(path):
    """Stream sheet2 and shared strings without converting identifiers to floats."""
    with zipfile.ZipFile(path) as archive:
        shared = []
        with archive.open("xl/sharedStrings.xml") as stream:
            for _, element in ET.iterparse(stream, events=("end",)):
                if element.tag == NS + "si":
                    shared.append("".join(text.text or "" for text in element.iter(NS + "t")))
                    element.clear()
        with archive.open("xl/worksheets/sheet2.xml") as stream:
            sheet_data = None
            for event, element in ET.iterparse(stream, events=("start", "end")):
                if event == "start" and element.tag == NS + "sheetData":
                    sheet_data = element
                if event != "end" or element.tag != NS + "row":
                    continue
                row = {}
                for cell in element.findall(NS + "c"):
                    address = re.fullmatch(r"([A-Z]+)[0-9]+", cell.get("r", ""))
                    if not address:
                        raise ValueError("Invalid worksheet cell address")
                    value = cell.find(NS + "v")
                    if cell.get("t") == "s":
                        if value is None or value.text is None:
                            raise ValueError("Missing shared-string index")
                        text = shared[int(value.text)]
                    elif cell.get("t") == "inlineStr":
                        text = "".join(part.text or "" for part in cell.iter(NS + "t"))
                    else:
                        text = value.text if value is not None and value.text is not None else ""
                    row[address[1]] = text
                yield row
                element.clear()
                if sheet_data is not None:
                    sheet_data.clear()


def _header(value):
    text = " ".join(value.split()).upper()
    return "".join(character for character in unicodedata.normalize("NFD", text) if not unicodedata.combining(character))


def _source_index(rows):
    headers = next(rows, None)
    required = {"C": "LABORATORIO", "E": "REGISTRO", "F": "EAN 1", "G": "EAN 2", "H": "EAN 3", "I": "PRODUTO", "J": "APRESENTACAO"}
    if not headers or any(_header(headers.get(column, "")) != name for column, name in required.items()):
        raise ValueError("Unexpected CMED sheet2 identity headers")
    columns = [(column, label) for column, label in headers.items() if PMC_LABEL.fullmatch(label.strip())]
    if not columns or not any(REGULAR_PMC.fullmatch(label.strip()) for _, label in columns):
        raise ValueError("CMED sheet2 has no regular PMC headers")
    normalized_labels = [re.sub(r"\s+", " ", label.strip()).upper() for _, label in columns]
    if len(set(normalized_labels)) != len(columns):
        raise ValueError("Duplicate CMED PMC headers")
    index = {}
    ambiguous = set()
    counts = Counter()
    for row in rows:
        counts["sourceRows"] += 1
        gtins = set()
        for column in ("F", "G", "H"):
            raw = row.get(column, "").strip()
            canonical = normalize_gtin(raw)
            if canonical:
                gtins.add(canonical)
            elif raw not in ("", "-", "--"):
                counts["invalidSourceGtinCells"] += 1
        if not gtins:
            continue
        reference = {"product": row.get("I", "").strip(), "presentation": row.get("J", "").strip(), "laboratory": row.get("C", "").strip(), "registration": row.get("E", "").strip()}
        rates = []
        error = None
        try:
            for column, label in columns:
                cents = price_cents(row.get(column, ""))
                if cents is not None:
                    rates.append({"label": label, "cents": cents})
        except ValueError:
            error = "invalid_source_row"
        if not all(value and len(value) <= 2000 and not re.search(r"[\x00-\x1f\x7f]", value) for value in reference.values()):
            error = "invalid_source_row"
        if error is None and not any(rate["cents"] > 0 and REGULAR_PMC.fullmatch(rate["label"].strip()) for rate in rates):
            error = "no_regular_pmc"
        reference["rates"] = rates
        # Include invalid/missing rows in global conflict detection too.
        signature = json.dumps({"identity": reference, "error": error, "rawRates": [row.get(column, "") for column, _ in columns] if error == "invalid_source_row" else None}, sort_keys=True, ensure_ascii=False)
        candidate = {"reference": reference, "error": error, "signature": signature}
        for gtin in gtins:
            if gtin in index and index[gtin]["signature"] != signature:
                ambiguous.add(gtin)
            else:
                index[gtin] = candidate
    counts["sourceGtins"] = len(index)
    counts["ambiguousSourceGtins"] = len(ambiguous)
    return index, ambiguous, counts


def _product_gtin(product):
    stored = product.get("eanNormalized")
    canonical = normalize_gtin(stored if stored is not None else product.get("ean"))
    if not canonical:
        return None, "invalid_product_gtin"
    if product.get("ean") is not None and normalize_gtin(product["ean"]) != canonical:
        return None, "conflicting_product_gtin"
    return canonical, None


def prepare(snapshot, rows, observed_at=None):
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("products"), list):
        raise ValueError("Catalog snapshot must contain a products array")
    observed = utc_iso(observed_at or snapshot.get("observedAt"))
    if observed[:10] < PUBLISHED_ON:
        raise ValueError("Observation predates pinned CMED edition")
    index, ambiguous, counts = _source_index(iter(rows))
    unique = {}
    conflicting_ids = set()
    for product in snapshot["products"]:
        if not isinstance(product, dict) or not isinstance(product.get("id"), str) or not product["id"].strip():
            raise ValueError("Catalog product requires a string id")
        product_id = product["id"]
        if product_id in unique and unique[product_id] != product:
            conflicting_ids.add(product_id)
        else:
            unique[product_id] = product
    gtin_counts = Counter(canonical for product in unique.values() if (canonical := _product_gtin(product)[0]))
    prepared = []
    exclusions = []
    for product_id, product in sorted(unique.items()):
        canonical, reason = _product_gtin(product)
        classification = product.get("catalogClassification")
        if product_id in conflicting_ids:
            reason = "conflicting_snapshot_id"
        elif not isinstance(classification, dict) or classification.get("kind") != "MEDICINE":
            reason = "not_medicine"
        elif product.get("isPopularPharmacy") is True:
            reason = "popular_pharmacy"
        elif product.get("status", "ACTIVE") != "ACTIVE" or product.get("deletedAt") is not None:
            reason = "inactive_product"
        elif canonical and gtin_counts[canonical] > 1:
            reason = "duplicate_snapshot_gtin"
        elif canonical in ambiguous:
            reason = "ambiguous_source_gtin"
        elif canonical and canonical not in index:
            reason = "source_gtin_not_found"
        if reason is None:
            reason = index[canonical]["error"]
        if reason is None:
            try:
                revision = utc_iso(product.get("updatedAt"))
                name, brand = product.get("name"), product.get("brand")
                if not isinstance(name, str) or not name or len(name) > 2000 or (brand is not None and (not isinstance(brand, str) or len(brand) > 2000)) or len(product_id) > 100:
                    raise ValueError("Invalid catalog identity")
            except (ValueError, TypeError):
                reason = "invalid_snapshot_identity"
        if reason:
            exclusions.append({"productId": product_id, "eanNormalized": canonical, "reason": reason})
            continue
        reference = {"version": 1, "eanNormalized": canonical, **index[canonical]["reference"], "sourceUrl": SOURCE_URL, "sourceSha256": SOURCE_SHA256, "publishedOn": PUBLISHED_ON, "observedAt": observed}
        prepared.append({"productId": product_id, "expectedUpdatedAt": revision, "expectedName": name, "expectedBrand": brand, "cmedReference": reference})
    warnings = ["snapshot_changed_during_capture"] if snapshot.get("snapshotChangedDuringCapture") is True else []
    counts.update({"capturedProducts": len(snapshot["products"]), "uniqueProducts": len(unique), "preparedProducts": len(prepared), "excludedProducts": len(exclusions)})
    summary = {**dict(counts), "sourceSha256": SOURCE_SHA256, "publishedOn": PUBLISHED_ON, "observedAt": observed, "warnings": warnings, "exclusionsByReason": dict(sorted(Counter(item["reason"] for item in exclusions).items()))}
    manifests = [{"version": 1, "products": prepared[start:start + 1000]} for start in range(0, len(prepared), 1000)]
    return {"manifests": manifests, "summary": summary, "exclusions": exclusions}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xlsx", required=True, type=Path)
    parser.add_argument("--catalog", required=True, type=Path)
    parser.add_argument("--observed-at", help="ISO observation timestamp; defaults to snapshot observedAt")
    parser.add_argument("--json", action="store_true", help="Print manifests, counts and exclusions as JSON; never write files")
    args = parser.parse_args()
    try:
        verify_source(args.xlsx)
        with args.catalog.open(encoding="utf-8-sig") as stream:
            snapshot = json.load(stream)
        result = prepare(snapshot, iter_sheet_rows(args.xlsx), args.observed_at)
    except (ValueError, OSError, KeyError, IndexError, zipfile.BadZipFile, ET.ParseError) as error:
        parser.exit(2, f"CMED preparation failed: {error}\n")
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result if args.json else result["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
