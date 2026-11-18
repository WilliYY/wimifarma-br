import assert from "node:assert/strict";
import test from "node:test";
import { blackFridayCampaign, isBlackFridayActive } from "./black-friday";

test("campanha começa no dia aprovado e termina na virada de novembro em Brasília", () => {
  assert.equal(isBlackFridayActive(blackFridayCampaign.startsAt - 1), false);
  assert.equal(isBlackFridayActive(blackFridayCampaign.startsAt), true);
  assert.equal(isBlackFridayActive(Date.parse("2026-12-01T02:59:59.999Z")), true);
  assert.equal(isBlackFridayActive(Date.parse("2026-12-01T03:00:00.000Z")), false);
  assert.equal(isBlackFridayActive(blackFridayCampaign.endsAt + 1), false);
});

test("um único desligamento remove a campanha mesmo durante a vigência", () => {
  assert.equal(isBlackFridayActive(blackFridayCampaign.startsAt, false), false);
});
