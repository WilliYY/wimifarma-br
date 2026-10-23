import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
import zipfile


SPEC = importlib.util.spec_from_file_location("prepare_cmed_reference", Path(__file__).with_name("prepare-cmed-reference.py"))
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

EAN = "7896004724577"
OBSERVED_AT = "2026-10-23T22:40:54.815176+00:00"
HEADERS = {"C": "LABORATÓRIO", "E": "REGISTRO", "F": "EAN 1", "G": "EAN 2", "H": "EAN 3", "I": "PRODUTO", "J": "APRESENTAÇÃO", "N": "PF 0%", "AN": "PMC Sem Impostos", "AO": "PMC 0 %", "AP": "PMC 12 %\u00a0 ALC"}


def row(**patch):
    return {"C": "LAB SINTÉTICO", "E": "0123456789012", "F": EAN, "G": "-", "H": "", "I": "PRODUTO SINTÉTICO", "J": "10 MG CT 30 COM", "N": "1,00", "AN": "8,00", "AO": "10,25", "AP": "9,00", **patch}


def product(**patch):
    return {"id": "synthetic-id", "name": "Medicamento sintético", "brand": "Laboratório sintético", "ean": EAN, "eanNormalized": None, "updatedAt": "2026-10-19T01:12:55.574", "catalogClassification": {"kind": "MEDICINE", "otc": False}, **patch}


def prepare(rows=None, products=None, **patch):
    snapshot = {"observedAt": OBSERVED_AT, "products": [product()] if products is None else products, **patch}
    return MODULE.prepare(snapshot, iter([HEADERS, row()] if rows is None else rows))


class PrepareCmedTests(unittest.TestCase):
    def test_exact_gtin_identity_and_original_labels(self):
        result = prepare()
        entry = result["manifests"][0]["products"][0]
        self.assertEqual(entry["cmedReference"]["eanNormalized"], "07896004724577")
        self.assertEqual(entry["cmedReference"]["registration"], "0123456789012")
        self.assertEqual(entry["cmedReference"]["rates"], [{"label": "PMC Sem Impostos", "cents": 800}, {"label": "PMC 0 %", "cents": 1025}, {"label": "PMC 12 %\u00a0 ALC", "cents": 900}])
        self.assertNotIn("price", entry)
        self.assertNotIn("stock", entry)

    def test_ambiguous_global_identity_or_prices_never_enters_manifest(self):
        for change in [{"J": "10 MG CT 60 COM"}, {"E": "9999999999999"}, {"C": "OUTRO LAB"}, {"AO": "10,26"}]:
            with self.subTest(change=change):
                result = prepare(rows=[HEADERS, row(), row(**change)])
                self.assertEqual(result["manifests"], [])
                self.assertEqual(result["exclusions"][0]["reason"], "ambiguous_source_gtin")
        self.assertEqual(prepare(rows=[HEADERS, row(), row()])["summary"]["preparedProducts"], 1)

    def test_exact_cents_and_invalid_values(self):
        for raw, expected in [("10,25", 1025), ("10.25", 1025), ("1.234,56", 123456), ("0", 0), ("1", 100), ("-", None), ("", None)]:
            self.assertEqual(MODULE.price_cents(raw), expected)
        for raw in ["-1,00", "NaN", "1,234", "1.001.00", "1000000,01", "1e3", True]:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                MODULE.price_cents(raw)
        result = prepare(rows=[HEADERS, row(AO="10,251")])
        self.assertEqual(result["exclusions"][0]["reason"], "invalid_source_row")

    def test_requires_regular_pmc_and_never_falls_back_to_pf(self):
        result = prepare(rows=[HEADERS, row(AO="", N="1,00")])
        self.assertEqual(result["manifests"], [])
        self.assertEqual(result["exclusions"][0]["reason"], "no_regular_pmc")

    def test_utc_normalization_matches_javascript_milliseconds(self):
        self.assertEqual(MODULE.utc_iso("2026-10-19T01:12:55.574"), "2026-10-19T01:12:55.574Z")
        self.assertEqual(MODULE.utc_iso("2026-10-19T01:12:55.574123-03:00"), "2026-10-19T04:12:55.574Z")
        self.assertEqual(MODULE.utc_iso("2026-10-19T01:12:55Z"), "2026-10-19T01:12:55.000Z")
        with self.assertRaises(ValueError):
            MODULE.utc_iso("2026-02-30T01:12:55Z")
        result = prepare()
        self.assertEqual(result["manifests"][0]["products"][0]["expectedUpdatedAt"], "2026-10-19T01:12:55.574Z")
        self.assertEqual(result["manifests"][0]["products"][0]["cmedReference"]["observedAt"], "2026-10-23T22:40:54.815Z")

    def test_nonmedicine_popular_and_invalid_gtin_are_excluded(self):
        cases = [(product(catalogClassification={"kind": "HYGIENE", "otc": True}), "not_medicine"), (product(catalogClassification=None), "not_medicine"), (product(isPopularPharmacy=True), "popular_pharmacy"), (product(ean="7896004724578"), "invalid_product_gtin"), (product(eanNormalized="17896004724574"), "conflicting_product_gtin")]
        for item, reason in cases:
            with self.subTest(reason=reason):
                result = prepare(products=[item])
                self.assertEqual(result["manifests"], [])
                self.assertEqual(result["exclusions"][0]["reason"], reason)

    def test_changed_snapshot_warns_and_duplicate_revisions_are_excluded(self):
        result = prepare(snapshotChangedDuringCapture=True)
        self.assertEqual(result["summary"]["preparedProducts"], 1)
        self.assertIn("snapshot_changed_during_capture", result["summary"]["warnings"])
        result = prepare(products=[product(), product(updatedAt="2026-10-20T00:00:00Z")])
        self.assertEqual(result["manifests"], [])
        self.assertEqual(result["exclusions"][0]["reason"], "conflicting_snapshot_id")

    def test_streaming_xml_handles_shared_and_inline_strings(self):
        source = io.BytesIO()
        with zipfile.ZipFile(source, "w") as archive:
            archive.writestr("xl/sharedStrings.xml", '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><r><t>PMC </t></r><r><t>0 %</t></r></si></sst>')
            archive.writestr("xl/worksheets/sheet2.xml", '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="AO1" t="s"><v>0</v></c><c r="E1" t="inlineStr"><is><t>0123456789012</t></is></c></row></sheetData></worksheet>')
        source.seek(0)
        self.assertEqual(list(MODULE.iter_sheet_rows(source)), [{"AO": "PMC 0 %", "E": "0123456789012"}])

    def test_source_sha256_pin_rejects_modified_file(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "untrusted.xlsx"
            path.write_bytes(b"synthetic modified input")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                MODULE.verify_source(path)

    def test_batches_are_bounded_and_ids_and_gtins_remain_unique(self):
        products = []
        rows = [HEADERS]
        for index in range(1001):
            body = f"789600{index:06d}"
            check = (-sum(int(digit) * (3 if offset % 2 == 0 else 1) for offset, digit in enumerate(reversed(body)))) % 10
            gtin = body + str(check)
            rows.append(row(F=gtin))
            products.append(product(id=f"synthetic-{index:04d}", ean=gtin))
        result = prepare(rows=rows, products=products)
        self.assertEqual([len(batch["products"]) for batch in result["manifests"]], [1000, 1])
        duplicate = prepare(products=[product(), product(id="other-id")])
        self.assertEqual(duplicate["manifests"], [])
        self.assertTrue(all(entry["reason"] == "duplicate_snapshot_gtin" for entry in duplicate["exclusions"]))


if __name__ == "__main__":
    unittest.main()
