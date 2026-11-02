import assert from "node:assert/strict";
import test from "node:test";
import { customerCreateSchema, customerProfileUpdateSchema } from "./schema";

test("perfil sem endereço pode salvar cidade vazia sem receber cidade padrão", () => {
  const parsed = customerProfileUpdateSchema.parse({ name: "Cliente Sintético", city: "" });
  assert.equal(parsed.city, "");
  assert.equal(parsed.address, null);
});

test("atualização antiga não troca cidade, CEP ou UF quando esses campos são omitidos", () => {
  const parsed = customerProfileUpdateSchema.parse({ name: "Cliente Sintético" });
  for (const field of ["city", "postalCode", "state"]) assert.equal(Object.hasOwn(parsed, field), false);
});

test("cadastro sem endereço não escolhe cidade e preserva cidade informada", () => {
  const input = { name: "Cliente Sintético", phone: "44999990000" };
  assert.equal(customerCreateSchema.parse(input).city, "");
  assert.equal(customerCreateSchema.parse({ ...input, city: "Ivaté" }).city, "Ivaté");
});

test("perfil aceita somente os campos próprios de cadastro e rejeita cidade inválida", () => {
  const parsed = customerProfileUpdateSchema.parse({ name: "Cliente Sintético", city: "Curitiba", postalCode: "80010-000", state: "PR", id: "outro-cliente", role: "ADMIN", status: "INACTIVE" });
  for (const field of ["postalCode", "state", "id", "role", "status"]) assert.equal(Object.hasOwn(parsed, field), false);
  assert.equal(customerProfileUpdateSchema.safeParse({ name: "Cliente Sintético", city: "C" }).success, false);
});
