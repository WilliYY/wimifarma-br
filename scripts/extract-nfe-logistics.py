"""Prepare an offline, review-only logistics queue from explicitly selected NF-e XML.

No database, email, network, archive extraction or application runtime is used.
The output contains supplier/commercial data and must remain in private storage.
Example: python -B scripts/extract-nfe-logistics.py --xml invoice.xml
         --catalog catalog.json --output private/queue.json
"""
import argparse
from collections import Counter
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

NS = {"n": "http://www.portalfiscal.inf.br/nfe"}
PREFIX = "{" + NS["n"] + "}"
MAX_XML_BYTES = 5 * 1024 * 1024
MAX_ITEMS = 1000
MAX_FILES = 100
MAX_ADDITIONAL_TEXT = 2000
MAX_CANDIDATE_REFERENCES = 10000
MAX_OUTPUT_BYTES = 8 * 1024 * 1024


class ExtractionError(ValueError):
    """A stable diagnostic code that never embeds source text or paths."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


def read_bounded(path, limit):
    if path.is_symlink() or not path.is_file():
        raise ExtractionError("REGULAR_FILE_REQUIRED")
    with path.open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ExtractionError("FILE_SIZE_LIMIT_EXCEEDED")
    return data


def gtin(original):
    value = original.strip() if original else ""
    valid = bool(re.fullmatch(r"[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14}", value))
    if valid:
        check = sum(int(digit) * (3 if index % 2 == 0 else 1)
                    for index, digit in enumerate(reversed(value[:-1])))
        valid = (10 - check % 10) % 10 == int(value[-1]) and int(value) != 0
    return {"original": original, "valid": valid,
            "normalized": value.zfill(14) if valid else None}


def text(element, path):
    child = element.find(path, NS)
    return child.text if child is not None else None


def decimal_text(element, path):
    value = text(element, path)
    if value is None:
        return None
    # Fixed-point, nonnegative NF-e values only. Preserve precision and trailing zeros.
    if not re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", value):
        raise ExtractionError("INVALID_DECIMAL")
    try:
        return str(Decimal(value))
    except InvalidOperation as error:
        raise ExtractionError("INVALID_DECIMAL") from error


def load_catalog(path):
    if path is None:
        return {}, None, []
    raw = read_bounded(path, 20 * 1024 * 1024)
    products = json.loads(raw.decode("utf-8-sig"))
    if isinstance(products, dict):
        products = products.get("products")
    if not isinstance(products, list) or len(products) > 100000:
        raise ValueError("Catalog must be an array or {products: []}, at most 100000 rows")
    index = {}
    warnings = []
    for position, product in enumerate(products, 1):
        if not isinstance(product, dict):
            raise ValueError(f"Invalid catalog row: {position}")
        for field in ("id", "name", "brand", "ean", "eanNormalized"):
            if product.get(field) is not None and not isinstance(product[field], str):
                raise ValueError(f"Catalog row {position}: {field} must be text")
        if not product.get("id"):
            raise ValueError(f"Catalog row {position}: id required")
        commercial = gtin(product.get("ean"))
        normalized = gtin(product.get("eanNormalized"))
        if (product.get("ean") and not commercial["valid"]
                or product.get("eanNormalized") and not normalized["valid"]
                or commercial["valid"] and normalized["valid"]
                and commercial["normalized"] != normalized["normalized"]):
            warnings.append({"catalogRow": position, "code": "invalid_or_conflicting_catalog_gtin"})
            continue
        key = commercial["normalized"] or normalized["normalized"]
        if key:
            candidate = {field: product.get(field) for field in ("id", "name", "brand", "ean", "eanNormalized")}
            candidate["catalogRow"] = position
            index.setdefault(key, []).append(candidate)
    return index, {"path": str(path.resolve()), "sha256": hashlib.sha256(raw).hexdigest()}, warnings


def match_product(commercial, tax, catalog, budget):
    candidates = catalog.get(commercial["normalized"], [])
    tax_candidates = catalog.get(tax["normalized"], [])
    # Count repeated references across BOTH candidate lists and ALL files before
    # constructing the output rows. Never silently omit ambiguous candidates.
    references = len(candidates) + len(tax_candidates)
    if budget["candidateReferences"] + references > MAX_CANDIDATE_REFERENCES:
        raise ExtractionError("CANDIDATE_BUDGET_EXCEEDED")
    budget["candidateReferences"] += references
    if len(candidates) > 1:
        status = "ambiguous_commercial"
    elif candidates:
        status = "commercial_candidate_pending_review"
    elif len(tax_candidates) > 1:
        status = "ambiguous_tax_pending_review"
    elif tax_candidates:
        status = "tax_only_pending_review"
    else:
        status = "unmatched"
    return {"status": status, "commercialCandidates": candidates, "taxCandidates": tax_candidates,
            "packageEquivalenceVerified": False}


def parse_invoice(path, catalog, budget):
    raw = read_bounded(path, MAX_XML_BYTES)
    if b"\x00" in raw:
        raise ExtractionError("NUL_OR_UTF16_REJECTED")
    source = raw.decode("utf-8-sig", errors="strict")
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", source, flags=re.IGNORECASE):
        raise ExtractionError("DTD_OR_ENTITY_REJECTED")
    declaration = re.match(r"\s*<\?xml\s+([^?]*)\?>", source)
    if declaration:
        encoding = re.search(r'''encoding\s*=\s*['"]([^'"]+)['"]''', declaration[1], re.IGNORECASE)
        if encoding and encoding[1].upper() != "UTF-8":
            raise ExtractionError("UNSUPPORTED_XML_ENCODING")
    root = ET.fromstring(source)
    if root.tag == PREFIX + "nfeProc":
        invoices = root.findall("n:NFe", NS)
        if len(invoices) != 1:
            raise ExtractionError("INVALID_NFE_STRUCTURE")
        nfe = invoices[0]
        locator = "/nfeProc/NFe/infNFe"
    elif root.tag == PREFIX + "NFe":
        nfe = root
        locator = "/NFe/infNFe"
    else:
        raise ExtractionError("INVALID_NFE_ROOT_OR_NAMESPACE")
    infos = nfe.findall("n:infNFe", NS)
    if len(infos) != 1:
        raise ExtractionError("INVALID_NFE_STRUCTURE")
    info = infos[0]
    nodes = info.findall("n:det", NS)
    if not nodes or len(nodes) > MAX_ITEMS:
        raise ExtractionError("ITEM_COUNT_LIMIT")
    numbers = Counter(node.get("nItem") for node in nodes)
    rows = []
    for position, node in enumerate(nodes, 1):
        product = node.find("n:prod", NS)
        if product is None:
            raise ExtractionError("MISSING_ITEM_PRODUCT")
        commercial = gtin(text(product, "n:cEAN"))
        tax = gtin(text(product, "n:cEANTrib"))
        warnings = []
        number = node.get("nItem")
        if not number:
            warnings.append("missing_nItem")
        if numbers[number] > 1:
            warnings.append("duplicate_nItem")
        if commercial["valid"] and tax["valid"] and commercial["normalized"] != tax["normalized"]:
            warnings.append("commercial_tax_gtin_differ")
        for field, value in (("cEAN", commercial), ("cEANTrib", tax)):
            if not value["valid"]:
                warnings.append(field + "_missing_or_invalid_gtin")
        additional = text(node, "n:infAdProd")
        if additional and len(additional) > MAX_ADDITIONAL_TEXT:
            additional = additional[:MAX_ADDITIONAL_TEXT]
            warnings.append("infAdProd_truncated")
        row = {field: text(product, "n:" + field)
               for field in ("cProd", "xProd", "cEAN", "cEANTrib", "uCom")}
        row.update({"nItem": number, "sourceLocator": f"{locator}/det[{position}]",
                    "qCom": decimal_text(product, "n:qCom"),
                    "vUnCom": decimal_text(product, "n:vUnCom"), "infAdProd": additional,
                    "commercialGtin": commercial, "taxGtin": tax,
                    "match": match_product(commercial, tax, catalog, budget), "warnings": warnings,
                    "physical": {"grossWeightKg": None, "netWeightKg": None,
                                 "widthCm": None, "heightCm": None, "lengthCm": None},
                    "shippingReady": False})
        rows.append(row)
    volumes = []
    for position, volume in enumerate(info.findall("n:transp/n:vol", NS), 1):
        volumes.append({"scope": "invoice_volume", "sourceLocator": f"{locator}/transp/vol[{position}]",
                        "qVol": decimal_text(volume, "n:qVol"), "pesoB": decimal_text(volume, "n:pesoB"),
                        "pesoL": decimal_text(volume, "n:pesoL"), "weightUnit": "kg"})
    return {"source": {"path": str(path.resolve()), "sha256": hashlib.sha256(raw).hexdigest()},
            "invoice": {"model": text(info, "n:ide/n:mod"), "number": text(info, "n:ide/n:nNF"),
                        "issuedAt": text(info, "n:ide/n:dhEmi") or text(info, "n:ide/n:dEmi"),
                        "issuer": {"cnpj": text(info, "n:emit/n:CNPJ"),
                                   "name": text(info, "n:emit/n:xNome")}},
            "volumes": volumes, "items": rows, "shippingReady": False, "duplicateOf": None}


def encode_bounded(result):
    """Bound serialized UTF-8 output before opening/replacing any output file."""
    chunks = []
    size = 0
    encoder = json.JSONEncoder(ensure_ascii=False, indent=2, allow_nan=False)
    for chunk in encoder.iterencode(result):
        size += len(chunk.encode("utf-8"))
        if size + 1 > MAX_OUTPUT_BYTES:
            raise ExtractionError("OUTPUT_SIZE_LIMIT_EXCEEDED")
        chunks.append(chunk)
    return "".join(chunks) + "\n"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xml", action="append", type=Path, default=[], help="Explicit XML file; repeatable")
    parser.add_argument("--xml-dir", type=Path, help="Immediate XML children only; no recursion")
    parser.add_argument("--catalog", type=Path, help="Private JSON snapshot: array or {products: []}")
    parser.add_argument("--output", type=Path, required=True, help="Private review JSON; parent must exist")
    parser.add_argument("--overwrite", action="store_true", help="Allow replacing the output only")
    args = parser.parse_args(argv)
    context = {"sourceKind": "arguments", "fileIndex": None}
    try:
        sources = list(args.xml)
        if args.xml_dir:
            if args.xml_dir.is_symlink() or not args.xml_dir.is_dir():
                raise ValueError("--xml-dir must be a regular local directory")
            sources += sorted((p for p in args.xml_dir.iterdir() if p.suffix.lower() == ".xml"),
                              key=lambda p: p.name)
        if not sources or len(sources) > MAX_FILES:
            raise ValueError(f"Select 1..{MAX_FILES} XML files explicitly")
        if any(path.suffix.lower() != ".xml" for path in sources):
            raise ValueError("Only .xml input files are permitted; archives are unsupported")
        output = args.output
        if output.suffix.lower() != ".json" or output.is_symlink():
            raise ValueError("Output must be a non-symlink .json file")
        protected = sources + ([args.catalog] if args.catalog else [])
        for path in protected:
            if (output.resolve() == path.resolve()
                    or output.exists() and path.exists() and output.samefile(path)):
                raise ValueError("Output must never replace source XML or catalog")
        if output.exists() and not args.overwrite:
            raise ValueError("Output exists; use --overwrite explicitly")
        context = {"sourceKind": "catalog", "fileIndex": 1}
        catalog, catalog_source, catalog_warnings = load_catalog(args.catalog)
        invoices = []
        seen = {}
        budget = {"candidateReferences": 0}
        for file_index, path in enumerate(sources, 1):
            context = {"sourceKind": "xml", "fileIndex": file_index}
            invoice = parse_invoice(path, catalog, budget)
            digest = invoice["source"]["sha256"]
            invoice["duplicateOf"] = seen.get(digest)
            seen.setdefault(digest, invoice["source"]["path"])
            invoices.append(invoice)
        result = {"schemaVersion": 1, "mode": "offline_review_only", "shippingReady": False,
                  "signatureVerified": False, "sefazStatusVerified": False,
                  "limitations": ["No signature, schema or SEFAZ status validation",
                                  "GTIN checksum does not prove authenticity or package equivalence",
                                  "Invoice volumes cannot establish individual item weight or dimensions",
                                  "No email metadata is verified; source paths identify local files only",
                                  "Free-text product fields may contain personal data; review privately"],
                  "catalogSource": catalog_source, "catalogWarnings": catalog_warnings, "invoices": invoices}
        context = {"sourceKind": "output", "fileIndex": 1}
        encoded = encode_bounded(result)
        with output.open("w" if args.overwrite else "x", encoding="utf-8", newline="\n") as stream:
            stream.write(encoded)
        return 0
    except (OSError, ValueError, ET.ParseError) as error:
        # File indices follow --xml order, then the sorted --xml-dir children.
        # Codes and indices are safe even when parser errors contain private XML.
        if isinstance(error, ExtractionError):
            code = error.code
        elif isinstance(error, UnicodeDecodeError):
            code = "INVALID_UTF8"
        elif isinstance(error, json.JSONDecodeError):
            code = "INVALID_CATALOG_JSON"
        elif isinstance(error, ET.ParseError):
            code = "MALFORMED_XML"
        elif isinstance(error, OSError):
            code = "FILE_IO_ERROR"
        elif context["sourceKind"] == "catalog":
            code = "INVALID_CATALOG_FORMAT"
        else:
            code = "INVALID_ARGUMENTS"
        print(json.dumps({"error": code, **context}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
