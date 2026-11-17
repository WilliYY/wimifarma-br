import assert from "node:assert/strict";
import test from "node:test";
import { collectCatalogEans, parseCotefacilEans } from "./cotefacil-eans";

test("prepara códigos válidos na ordem de entrada, preservando zeros e removendo equivalentes", () => {
  assert.deepEqual(parseCotefacilEans("012345678905, 0012345678905\n7896181915638;7896181915639\tinválido"), {
    eans: ["012345678905", "7896181915638"],
    duplicates: 1,
    invalid: 2,
  });
  assert.deepEqual(parseCotefacilEans(" \n ; , "), { eans: [], duplicates: 0, invalid: 0 });
});

test("prefere a identidade canônica, preserva a grafia original compatível e aceita EAN legado", () => {
  assert.deepEqual(collectCatalogEans([
    { eanNormalized: "00012345678905", ean: "012345678905" },
    { eanNormalized: null, ean: "0012345678905" },
    { eanNormalized: "inválido", ean: "7896181915638" },
    { eanNormalized: "17896181915635", ean: "7896181915638" },
    { eanNormalized: null, ean: "7896181915639" },
    { eanNormalized: null, ean: null },
    { eanNormalized: " ", ean: "" },
  ]), {
    eans: ["012345678905", "17896181915635", "7896181915638"],
    duplicates: 1,
    invalid: 1,
    missing: 2,
  });
});
