"""Synthetic offline regression suite; run with Python -B directly."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("extract-nfe-logistics.py")
NS = "http://www.portalfiscal.inf.br/nfe"


def item(number="1", ean="7894900011517", tax="7894900011517"):
    return f'''<det nItem="{number}"><prod><cProd>001</cProd><xProd>Produto sintético</xProd>
    <cEAN>{ean}</cEAN><cEANTrib>{tax}</cEANTrib><uCom>CX</uCom>
    <qCom>2.0000</qCom><vUnCom>10.5000000000</vUnCom></prod>
    <infAdProd>Caixa; conferir apresentação</infAdProd></det>'''


def xml(items=None, proc=False):
    body = f'''<NFe xmlns="{NS}"><infNFe Id="NFeSYNTHETIC"><ide><mod>55</mod>
    <nNF>123</nNF><dhEmi>2026-10-25T10:00:00-03:00</dhEmi></ide>
    <emit><CNPJ>00000000000000</CNPJ><xNome>Emissor sintético</xNome></emit>
    <dest><CPF>PRIVATE_RECIPIENT</CPF><xNome>PRIVATE_NAME</xNome></dest>
    {items if items is not None else item()}
    <transp><vol><qVol>3</qVol><pesoB>12.300</pesoB><pesoL>11.100</pesoL></vol></transp>
    </infNFe></NFe>'''
    return (f'<nfeProc xmlns="{NS}">{body}<protNFe/></nfeProc>' if proc else body).encode()


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "invoice.xml"
        self.source.write_bytes(xml())
        self.output = self.root / "queue.json"

    def run_cli(self, *args, ok=True):
        result = subprocess.run([sys.executable, "-B", str(SCRIPT), *map(str, args)],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0 if ok else 2, result.stderr)
        return result

    def extract(self, data=None, catalog=None, *extra):
        if data is not None:
            self.source.write_bytes(data)
        args = ["--xml", self.source, "--output", self.output]
        if catalog is not None:
            path = self.root / "catalog.json"
            path.write_text(json.dumps(catalog), encoding="utf-8")
            args += ["--catalog", path]
        self.run_cli(*args, *extra)
        return json.loads(self.output.read_text(encoding="utf-8"))

    def test_official_namespace_and_proc_provenance_privacy(self):
        for proc in (False, True):
            with self.subTest(proc=proc):
                data = xml(proc=proc)
                result = self.extract(data, None, "--overwrite")
                invoice = result["invoices"][0]
                self.assertEqual(invoice["source"]["sha256"], hashlib.sha256(data).hexdigest())
                self.assertEqual(invoice["invoice"]["model"], "55")
                self.assertIn("det", invoice["items"][0]["sourceLocator"])
                self.assertNotIn("PRIVATE", json.dumps(result))
                self.assertFalse(result["sefazStatusVerified"])
                self.assertFalse(result["signatureVerified"])

    def test_gtin_zero_padding_decimal_and_no_physical_inference(self):
        result = self.extract(xml(item(ean="00012345600012", tax="012345600012")))
        row = result["invoices"][0]["items"][0]
        self.assertEqual(row["commercialGtin"]["original"], "00012345600012")
        self.assertEqual(row["commercialGtin"]["normalized"], "00012345600012")
        self.assertTrue(row["commercialGtin"]["valid"])
        self.assertEqual(row["qCom"], "2.0000")
        self.assertEqual(row["vUnCom"], "10.5000000000")
        self.assertFalse(row["shippingReady"])
        self.assertTrue(all(value is None for value in row["physical"].values()))

    def test_invalid_gtin_not_matched_and_sem_gtin(self):
        result = self.extract(xml(item(ean="7894900011518", tax="SEM GTIN")),
                              [{"id": "a", "ean": "7894900011518"}])
        row = result["invoices"][0]["items"][0]
        self.assertFalse(row["commercialGtin"]["valid"])
        self.assertEqual(row["match"]["status"], "unmatched")
        self.assertIsNone(row["taxGtin"]["normalized"])

    def test_catalog_numeric_gtin_rejected_and_conflicting_identity_excluded(self):
        catalog = self.root / "catalog.json"
        catalog.write_text(json.dumps([{"id": "numeric", "ean": 7894900011517}]))
        self.run_cli("--xml", self.source, "--catalog", catalog, "--output", self.output, ok=False)
        self.assertFalse(self.output.exists())
        result = self.extract(catalog={"products": [
            {"id": "conflict", "ean": "7894900011517", "eanNormalized": "00012345600012"}]})
        self.assertEqual(result["invoices"][0]["items"][0]["match"]["status"], "unmatched")
        self.assertEqual(len(result["catalogWarnings"]), 1)
        self.assertIsNotNone(result["catalogSource"]["sha256"])

    def test_commercial_and_tax_matches_never_equate_packages(self):
        catalog = [{"id": "commercial", "name": "Caixa", "ean": "7894900011517"},
                   {"id": "tax", "name": "Unidade", "eanNormalized": "00012345600012"}]
        row = self.extract(xml(item(tax="00012345600012")), catalog)["invoices"][0]["items"][0]
        self.assertEqual(row["match"]["status"], "commercial_candidate_pending_review")
        self.assertEqual(row["match"]["commercialCandidates"][0]["id"], "commercial")
        self.assertEqual(row["match"]["taxCandidates"][0]["id"], "tax")
        self.assertIn("commercial_tax_gtin_differ", row["warnings"])
        self.output.unlink()
        row = self.extract(xml(item(ean="SEM GTIN", tax="00012345600012")), catalog)["invoices"][0]["items"][0]
        self.assertEqual(row["match"]["status"], "tax_only_pending_review")

    def test_ambiguity_and_duplicate_inputs_and_items_explicit(self):
        catalog = [{"id": "a", "ean": "7894900011517"},
                   {"id": "b", "ean": "7894900011517"}]
        result = self.extract(xml(item() + item()), catalog)
        self.assertEqual(result["invoices"][0]["items"][0]["match"]["status"], "ambiguous_commercial")
        self.assertIn("duplicate_nItem", result["invoices"][0]["items"][0]["warnings"])
        clone = self.root / "clone.xml"
        clone.write_bytes(self.source.read_bytes())
        self.run_cli("--xml", self.source, "--xml", clone, "--output", self.output, "--overwrite")
        result = json.loads(self.output.read_text())
        self.assertEqual(result["invoices"][1]["duplicateOf"], str(self.source.resolve()))

    def test_multi_product_invoice_volumes_are_not_allocated(self):
        result = self.extract(xml(item() + item("2")))
        invoice = result["invoices"][0]
        self.assertEqual(invoice["volumes"][0]["pesoB"], "12.300")
        self.assertEqual(invoice["volumes"][0]["scope"], "invoice_volume")
        for row in invoice["items"]:
            self.assertTrue(all(value is None for value in row["physical"].values()))

    def test_reject_unsafe_or_unrelated_input_without_output(self):
        cases = [b'<!DOCTYPE NFe [<!ENTITY x "boom">]>' + xml(),
                 b'<!ENTITY x "boom">' + xml(), xml().decode().encode("utf-16"),
                 xml() + b"\x00", b"x" * (5 * 1024 * 1024 + 1),
                 b'<NFe xmlns="http://other.example"/>', b'<unrelated/>',
                 b'<?xml version="1.0" encoding="iso-8859-1"?>' + xml(),
                 xml().replace(b'2.0000', b'NaN')]
        for data in cases:
            with self.subTest(prefix=data[:45]):
                self.source.write_bytes(data)
                self.run_cli("--xml", self.source, "--output", self.output, ok=False)
                self.assertFalse(self.output.exists())

    def test_limits_bom_and_bounded_additional_text(self):
        result = self.extract(b'\xef\xbb\xbf' + xml().replace(b'Caixa; conferir', b'X' * 3000))
        row = result["invoices"][0]["items"][0]
        self.assertLessEqual(len(row["infAdProd"]), 2000)
        self.assertIn("infAdProd_truncated", row["warnings"])
        self.output.unlink()
        self.source.write_bytes(xml(item() * 1001))
        self.run_cli("--xml", self.source, "--output", self.output, ok=False)

    def test_deterministic_output_and_source_never_overwritten(self):
        original = self.source.read_bytes()
        self.extract()
        first = self.output.read_bytes()
        self.run_cli("--xml", self.source, "--output", self.output, ok=False)
        self.assertEqual(first, self.output.read_bytes())
        self.run_cli("--xml", self.source, "--output", self.output, "--overwrite")
        self.assertEqual(first, self.output.read_bytes())
        self.run_cli("--xml", self.source, "--output", self.source, "--overwrite", ok=False)
        self.assertEqual(original, self.source.read_bytes())
        self.assertEqual({p.name for p in self.root.iterdir()}, {"invoice.xml", "queue.json"})

    def test_hardlink_output_cannot_modify_xml_or_catalog(self):
        linked = self.root / "linked.json"
        os.link(self.source, linked)
        original = self.source.read_bytes()
        self.run_cli("--xml", self.source, "--output", linked, "--overwrite", ok=False)
        self.assertEqual(self.source.read_bytes(), original)
        linked.unlink()
        catalog = self.root / "catalog.json"
        catalog.write_text('[{"id":"a","ean":"7894900011517"}]')
        original = catalog.read_bytes()
        self.run_cli("--xml", self.source, "--catalog", catalog,
                     "--output", catalog, "--overwrite", ok=False)
        self.assertEqual(catalog.read_bytes(), original)

    def test_rejected_batch_preserves_existing_output(self):
        self.extract()
        original = self.output.read_bytes()
        bad = self.root / "bad.xml"
        bad.write_bytes(b"<unrelated/>")
        self.run_cli("--xml", self.source, "--xml", bad,
                     "--output", self.output, "--overwrite", ok=False)
        self.assertEqual(self.output.read_bytes(), original)

    def test_aggregate_candidate_budget_rejects_without_silent_truncation(self):
        self.source.write_bytes(xml("".join(item(str(i)) for i in range(20))))
        catalog = self.root / "catalog.json"
        catalog.write_text(json.dumps([{"id": str(i), "ean": "7894900011517"}
                                       for i in range(500)]))
        result = self.run_cli("--xml", self.source, "--catalog", catalog,
                              "--output", self.output, ok=False)
        self.assertEqual(json.loads(result.stderr), {
            "error": "CANDIDATE_BUDGET_EXCEEDED", "sourceKind": "xml", "fileIndex": 1})
        self.assertFalse(self.output.exists())
        # The same finite budget spans files, not just each invoice separately.
        self.source.write_bytes(xml("".join(item(str(i)) for i in range(6))))
        second = self.root / "second.xml"
        second.write_bytes(self.source.read_bytes())
        self.output.write_text("preserve existing review")
        result = self.run_cli("--xml", self.source, "--xml", second, "--catalog", catalog,
                              "--output", self.output, "--overwrite", ok=False)
        self.assertEqual(json.loads(result.stderr)["fileIndex"], 2)
        self.assertEqual(self.output.read_text(), "preserve existing review")

    def test_output_bytes_limit_precedes_output_write(self):
        catalog = self.root / "catalog.json"
        catalog.write_text(json.dumps([{"id": "large", "ean": "7894900011517",
                                        "name": "X" * 1000000}]))
        self.source.write_bytes(xml("".join(item(str(i)) for i in range(5))))
        result = self.run_cli("--xml", self.source, "--catalog", catalog,
                              "--output", self.output, ok=False)
        self.assertEqual(json.loads(result.stderr)["error"], "OUTPUT_SIZE_LIMIT_EXCEEDED")
        self.assertFalse(self.output.exists())

    def test_safe_error_identifies_reason_and_file_without_xml_or_path(self):
        bad = self.root / "PRIVATE_CUSTOMER_FILE.xml"
        bad.write_bytes(b'<!DOCTYPE PRIVATE_RECIPIENT [<!ENTITY x "PRIVATE_NAME">]>' + xml())
        result = self.run_cli("--xml", self.source, "--xml", bad,
                              "--output", self.output, ok=False)
        self.assertEqual(json.loads(result.stderr), {
            "error": "DTD_OR_ENTITY_REJECTED", "sourceKind": "xml", "fileIndex": 2})
        self.assertNotIn("PRIVATE", result.stderr)
        self.assertNotIn(str(self.root), result.stderr)
        self.assertFalse(self.output.exists())
        bad.write_bytes(b"<NFe>")
        result = self.run_cli("--xml", bad, "--output", self.output, ok=False)
        self.assertEqual(json.loads(result.stderr)["error"], "MALFORMED_XML")

    def test_explicit_directory_nonrecursive_and_json_only(self):
        nested = self.root / "nested"
        nested.mkdir()
        (nested / "bad.xml").write_text("invalid")
        (self.root / "ignore.zip").write_bytes(b"not ZIP")
        self.run_cli("--xml-dir", self.root, "--output", self.output)
        self.assertEqual(len(json.loads(self.output.read_text())["invoices"]), 1)
        self.run_cli("--xml", self.source, "--output", self.root / "bad.csv", ok=False)


if __name__ == "__main__":
    unittest.main()
