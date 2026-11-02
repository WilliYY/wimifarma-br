import assert from "node:assert/strict";
import test from "node:test";
import { productKitPricing } from "./kit-pricing";

const soap = { name: "Sabonete Rexona Multivitaminas 84g", brand: "Rexona", category: "Higiene pessoal", price: "2.08", promotionalPrice: null, stock: 20, requiresPrescription: false };
const kit = { ...soap, name: "Kit sabonete Rexona Multivitaminas 6x84g", price: "11.00" };

test("kit de seis mostra preço por barra e economia real em centavos", () => {
  assert.deepEqual(productKitPricing(kit, [soap]), {
    quantity: 6, totalCents: 1100, perItemCents: 183,
    savingCents: 148, individualTotalCents: 1248,
  });
});

test("aceita apresentações equivalentes sem confundir contagem e conteúdo", () => {
  for (const name of ["Kit 6 Sabonetes Rexona Multivitaminas 84g", "Kit Sabonete Rexona Multivitaminas 6un 84 g", "Kit com 6 unidades Sabonetes Rexona Multivitaminas 0,084 kg"]) {
    assert.equal(productKitPricing({ ...kit, name }, [soap])?.savingCents, 148);
  }
});

test("usa ofertas atuais e o menor preço equivalente disponível", () => {
  const result = productKitPricing({ ...kit, promotionalPrice: "10.50" }, [soap, { ...soap, promotionalPrice: "1.99" }]);
  assert.equal(result?.totalCents, 1050);
  assert.equal(result?.individualTotalCents, 1194);
  assert.equal(result?.savingCents, 144);
});

test("não inventa economia com outra linha, tamanho, marca ou quantidade indisponível", () => {
  for (const candidate of [
    { ...soap, name: "Sabonete Rexona Antibacterial Fresh 84g" },
    { ...soap, name: "Sabonete Rexona Multivitaminas 90g" },
    { ...soap, brand: "Outra marca" },
    { ...soap, stock: 0 }, { ...soap, stock: 5 },
    { ...soap, name: kit.name },
    { ...soap, price: "1.50" },
  ]) {
    const result = productKitPricing(kit, [candidate]);
    assert.equal(result?.perItemCents, 183);
    assert.equal(result?.savingCents, null);
    assert.equal(result?.individualTotalCents, null);
  }
});

test("recusa apresentações ambíguas, kits mistos, medicamentos e valores inválidos", () => {
  for (const product of [
    soap, { ...kit, name: "Kit sabonetes Rexona" },
    { ...kit, name: "Kit sabonete Rexona 6x84g + desodorante 150ml" },
    { ...kit, name: "Kit sabonetes Rexona 6un 3x84g" },
    { ...kit, name: "Kit sabonete líquido Rexona 6x200ml" },
    { ...kit, stock: 0 }, { ...kit, price: "NaN" },
    { ...kit, price: "-1" }, { ...kit, price: "0.01" }, { ...kit, requiresPrescription: true },
  ]) assert.equal(productKitPricing(product, [soap]), null);
  assert.equal(productKitPricing(kit, [])?.savingCents, null);
});
