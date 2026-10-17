import assert from "node:assert/strict";
import test from "node:test";
import { getSupplierPreparationEstimate } from "./preparation";

const cases = [
  ["sexta antes do corte recebe sábado", "2026-10-16T17:00:00-03:00", "2026-10-17", 1],
  ["sexta após o corte recebe terça", "2026-10-16T19:00:00-03:00", "2026-10-20", 4],
  ["sábado recebe terça", "2026-10-17T17:00:00-03:00", "2026-10-20", 3],
  ["domingo recebe terça", "2026-10-18T17:00:00-03:00", "2026-10-20", 2],
  ["segunda recebe terça", "2026-10-19T17:00:00-03:00", "2026-10-20", 1],
  ["terça antes do corte recebe quarta", "2026-10-20T17:00:00-03:00", "2026-10-21", 1],
  ["terça após o corte recebe quinta", "2026-10-20T19:00:00-03:00", "2026-10-22", 2],
  ["corte inclui exatamente 18h30", "2026-10-16T18:30:00-03:00", "2026-10-17", 1],
  ["um milissegundo após o corte avança a data efetiva", "2026-10-16T18:30:00.001-03:00", "2026-10-20", 4],
  ["antes da abertura mantém a data do pedido", "2026-10-20T06:00:00-03:00", "2026-10-21", 1],
  ["usa a data local mesmo com UTC no dia seguinte", "2026-10-17T01:00:00Z", "2026-10-20", 4],
  ["atravessa a virada do mês", "2026-10-31T17:00:00-03:00", "2026-11-03", 3],
  ["atravessa a virada do ano sem presumir feriados", "2026-12-31T17:00:00-03:00", "2027-01-01", 1],
] as const;

for (const [name, timestamp, readyDate, preparationDays] of cases) {
  test(name, () => {
    const now = new Date(timestamp);
    const originalTime = now.getTime();
    const estimate = getSupplierPreparationEstimate(now);
    assert.equal(estimate.readyAt.toISOString(), `${readyDate}T21:30:00.000Z`);
    assert.equal(estimate.preparationDays, preparationDays);
    assert.equal(now.getTime(), originalTime);
  });
}

test("informa dia e mês no calendário de São Paulo", () => {
  assert.equal(getSupplierPreparationEstimate(new Date("2026-10-16T17:00:00-03:00")).readyDateLabel, "17/10");
});
