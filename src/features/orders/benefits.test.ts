import assert from "node:assert/strict";
import test from "node:test";
import { allocateOrderBenefits } from "./benefits";

test("combina cashback e WimiCoins uma vez sobre o preço líquido", () => {
  const result = allocateOrderBenefits([{ totalCents: 1000, wimicoinsEligible: true }, { totalCents: 500, wimicoinsEligible: true }], 300, 500);
  assert.equal(result.reduce((sum,item)=>sum+item.cashbackDiscountCents,0),300);
  assert.equal(result.reduce((sum,item)=>sum+item.wimicoinsDiscountPoints,0),500);
  assert.equal(result.reduce((sum,item)=>sum+item.paidCents,0),700);
  assert.ok(result.every(item=>item.paidCents>=0));
});

test("WimiCoins não descontam itens restritos e respeitam o teto após cashback", () => {
  const result = allocateOrderBenefits([{ totalCents: 1000, wimicoinsEligible: false }, { totalCents: 500, wimicoinsEligible: true }], 300, 400);
  assert.equal(result[0].wimicoinsDiscountPoints,0);
  assert.equal(result[1].paidCents,0);
  assert.throws(()=>allocateOrderBenefits([{totalCents:500,wimicoinsEligible:true}],300,201));
  assert.throws(()=>allocateOrderBenefits([{totalCents:500,wimicoinsEligible:false}],0,1));
});

test("divisão de centavos preserva ambas as carteiras e o total", () => {
  const result=allocateOrderBenefits([1,1,1].map(totalCents=>({totalCents,wimicoinsEligible:true})),1,1);
  assert.equal(result.reduce((sum,item)=>sum+item.paidCents,0),1);
  assert.equal(result.reduce((sum,item)=>sum+item.cashbackDiscountCents+item.wimicoinsDiscountPoints,0),2);
  assert.throws(()=>allocateOrderBenefits([{totalCents:1,wimicoinsEligible:true}],0,-1));
});

test("crédito de compra respeita cashback, capacidade dos Coins e conservação de centavos", () => {
  const items = [{ totalCents: 100, wimicoinsEligible: false }, { totalCents: 100, wimicoinsEligible: true }];
  const result = allocateOrderBenefits(items, 20, 90, 90);
  assert.equal(result.reduce((sum, item) => sum + item.storeCreditDiscountCents, 0), 90);
  assert.equal(result.reduce((sum, item) => sum + item.paidCents, 0), 0);
  assert.equal(result[0].wimicoinsDiscountPoints, 0);
  assert.throws(() => allocateOrderBenefits(items, 20, 90, 91));
});
