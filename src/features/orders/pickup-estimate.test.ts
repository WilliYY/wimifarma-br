import assert from "node:assert/strict";
import test from "node:test";
import { getPickupEstimate, pickupTimeLabel, pickupWaitLabel, synchronizedPickupTime } from "./pickup-estimate";

test("retirada leva até 30 minutos durante o atendimento", () => {
  const estimate = getPickupEstimate(new Date("2026-10-11T10:00:00-03:00"));
  assert.equal(estimate.readyAt.toISOString(), "2026-10-11T13:30:00.000Z");
  assert.equal(estimate.waitMinutes, 30);
  assert.equal(estimate.openNow, true);
  assert.equal(estimate.readyToday, true);
});

test("antes da abertura, prepara às 8h do mesmo dia e inclui a espera", () => {
  const estimate = getPickupEstimate(new Date("2026-10-11T06:00:00-03:00"));
  assert.equal(estimate.readyAt.toISOString(), "2026-10-11T11:00:00.000Z");
  assert.equal(estimate.waitMinutes, 120);
  assert.equal(estimate.openNow, false);
  assert.equal(estimate.readyToday, true);
});

test("às 7h30 já conta os 30 minutos de preparação", () => {
  assert.equal(getPickupEstimate(new Date("2026-10-11T07:30:00-03:00")).readyAt.toISOString(), "2026-10-11T11:00:00.000Z");
});

test("às 18h permite concluir no fechamento às 18h30", () => {
  const estimate = getPickupEstimate(new Date("2026-10-11T18:00:00-03:00"));
  assert.equal(estimate.readyAt.toISOString(), "2026-10-11T21:30:00.000Z");
  assert.equal(estimate.readyToday, true);
});

test("perto do fechamento, conta o restante na próxima abertura", () => {
  const estimate = getPickupEstimate(new Date("2026-10-11T18:15:00-03:00"));
  assert.equal(estimate.readyAt.toISOString(), "2026-10-12T10:45:00.000Z");
  assert.equal(estimate.waitMinutes, 810);
  assert.equal(estimate.openNow, true);
  assert.equal(estimate.readyToday, false);
});

test("no fechamento e depois dele, prepara às 8h do dia seguinte", () => {
  for (const time of ["18:30:00", "23:00:00"]) {
    const estimate = getPickupEstimate(new Date(`2026-10-11T${time}-03:00`));
    assert.equal(estimate.readyAt.toISOString(), "2026-10-12T11:00:00.000Z");
    assert.equal(estimate.openNow, false);
    assert.equal(estimate.readyToday, false);
  }
  assert.equal(getPickupEstimate(new Date("2026-10-11T23:00:00-03:00")).waitMinutes, 540);
});

test("usa o dia local de Ivaté mesmo quando o UTC já virou", () => {
  const estimate = getPickupEstimate(new Date("2026-10-12T01:00:00Z"));
  assert.equal(estimate.readyAt.toISOString(), "2026-10-12T11:00:00.000Z");
  assert.equal(estimate.readyToday, false);
});

test("domingo tem atendimento e a virada de ano preserva o calendário", () => {
  assert.equal(getPickupEstimate(new Date("2026-10-11T12:00:00-03:00")).waitMinutes, 30);
  assert.equal(getPickupEstimate(new Date("2026-12-31T20:00:00-03:00")).readyAt.toISOString(), "2027-01-01T11:00:00.000Z");
});

test("não promete retirada antes de completar os minutos de atendimento", () => {
  const estimate = getPickupEstimate(new Date("2026-10-11T18:29:59-03:00"));
  assert.equal(estimate.readyAt.toISOString(), "2026-10-12T10:59:59.000Z");
  assert.equal(estimate.waitMinutes, 810);
  assert.equal(pickupTimeLabel(estimate.readyAt), "08:00");
});

test("informa a espera total em horas e minutos", () => {
  const estimate = getPickupEstimate(new Date("2026-10-11T23:15:00-03:00"));
  assert.equal(pickupWaitLabel(estimate.waitMinutes), "8h 45min");
  assert.equal(pickupWaitLabel(30), "30 minutos");
});

test("sincronização usa resposta fresca e compensa o trânsito da resposta", () => {
  const currentTime = synchronizedPickupTime("2026-10-11T21:00:30.000Z", 200);
  assert.equal(currentTime, Date.parse("2026-10-11T21:00:30.100Z"));
  const estimate = getPickupEstimate(new Date(currentTime));
  assert.equal(estimate.readyToday, false);
  assert.equal(pickupTimeLabel(estimate.readyAt), "07:31");
});

test("sincronização rejeita horário inválido", () => {
  assert.throws(() => synchronizedPickupTime("invalid", 10), RangeError);
});
