import assert from "node:assert/strict";
import test from "node:test";
import { changePercentage } from "./percentage";

test("botoes avancam um ponto percentual preservando centesimos e limites", () => {
  assert.equal(changePercentage("2.35", 1), "3.35");
  assert.equal(changePercentage("2,35", -1), "1.35");
  assert.equal(changePercentage("0.25", -1), "0.01");
  assert.equal(changePercentage("99.5", 1), "100");
  assert.equal(changePercentage("", 1), "1");
});
