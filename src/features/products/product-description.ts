import type { PrescriptionType } from "./purchase-policy";
import { readClassification } from "./catalog-operations";

type ProductDescriptionInput = {
  brand: string | null;
  category?: string | null;
  catalogClassification?: unknown;
  description: string | null;
  ean?: string | null;
  isPopularPharmacy?: boolean;
  name: string;
  prescriptionType?: PrescriptionType;
  requiresPrescription?: boolean;
};

// Only replace the complete importer template. Editorial text always wins.
const importedDescription = /^.+, marca .+, conforme a apresentação identificada pelo EAN\. Confira o rótulo, o modo de uso e as advertências da embalagem antes de utilizar\. Conserve conforme as orientações do fabricante\.$/u;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// These describe the product type, without inferring claims for a particular formula.
const productTypes: { name: RegExp; introduction: string; detail: string }[] = [
  {
    name: /\bpre[ -]?(?:sh|shampoo)\b/,
    introduction: "Um primeiro passo para o seu ritual capilar.",
    detail: "O pré-shampoo entra antes da lavagem. Confira na embalagem como incluir esta etapa na sua rotina e quais cuidados acompanham a aplicação.",
  },
  {
    name: /\b(?:sh|shampoo)\b/,
    introduction: "O cuidado com os cabelos começa na lavagem.",
    detail: "Um shampoo para a etapa de limpeza dos fios e do couro cabeludo. Confira a indicação desta versão e combine os próximos passos da rotina com as necessidades do seu cabelo.",
  },
  {
    name: /\bcond(?:icionador)?\b/,
    introduction: "Complete o seu ritual de cuidado com os cabelos.",
    detail: "O condicionador acompanha a rotina após a lavagem. Siga a indicação de aplicação e enxágue desta versão para aproveitar o cuidado de acordo com as orientações do fabricante.",
  },
  {
    name: /\bmasc(?:ara)?\b.*\b(?:dercos|capilar)\b/,
    introduction: "Um momento dedicado ao cuidado dos fios.",
    detail: "A máscara capilar acrescenta uma etapa ao seu ritual de cuidado com os cabelos. Respeite o tempo de pausa e a forma de aplicação indicados para esta versão.",
  },
  {
    name: /\blab(?:ial)?\b|\blip\b/,
    introduction: "Um cuidado especial para os lábios, onde você estiver.",
    detail: "Inclua o cuidado labial nos seus momentos de autocuidado. Confira a apresentação e as instruções desta versão antes de aplicar.",
  },
  {
    name: /\bafter ?sun\b|\bpos[ -]sol\b/,
    introduction: "Um momento de cuidado com a pele depois do sol.",
    detail: "Inclua o pós-sol na sua rotina conforme as instruções da embalagem. Este cuidado complementa a rotina e não substitui o uso de protetor solar.",
  },
  {
    name: /\bprot(?:etor)?\s+(?:solar|facial)\b|\b(?:fotop|anthelios|capital soleil|sunfresh|fusion water|invisible stick|magic repair|magic glow)\b|\b(?:nivea|neutrogena) sun\b/,
    introduction: "Proteção solar para acompanhar os seus momentos ao ar livre.",
    detail: "Uma opção para a etapa de proteção solar da rotina. Confira o fator, a tonalidade quando houver e a área de aplicação desta versão. Siga as orientações da embalagem sobre quantidade e reaplicação.",
  },
  {
    name: /\bdes(?:od|odorante)?\b|\bantitransp(?:irante)?\b|\bantitrans\b|\broll[ -]?on\b/,
    introduction: "O cuidado das axilas também faz parte do seu dia.",
    detail: "Escolha a apresentação e a fragrância que combinam com a sua rotina. Confira na embalagem a forma de aplicação e os cuidados para o uso desta versão.",
  },
  {
    name: /\bmicelar\b|\bmicellar\b|\bdemaq(?:uilante)?\b/,
    introduction: "Um passo de limpeza facial no seu momento de autocuidado.",
    detail: "Uma opção para compor a limpeza da pele. Confira se esta versão é indicada para remover maquiagem e como aplicá-la nas áreas recomendadas pelo fabricante.",
  },
  {
    name: /\besf(?:ol|oliante)?\b/,
    introduction: "Renove o seu momento de cuidado com uma etapa de esfoliação.",
    detail: "Confira se esta apresentação é facial ou corporal e respeite a frequência indicada na embalagem. A escolha do produto deve acompanhar as necessidades da sua pele.",
  },
  {
    name: /\b(?:sab(?:onete)?|limp(?:eza)?|cleanser|cleansing)\b/,
    introduction: "Uma rotina de cuidado começa com a limpeza da pele.",
    detail: "Uma opção para a etapa de limpeza do seu dia. Confira a área de aplicação e a indicação desta versão para escolher o cuidado que combina com a sua rotina.",
  },
  {
    name: /\bmaos\b|\bpes\b/,
    introduction: "Atenção aos detalhes no cuidado de mãos e pés.",
    detail: "Uma etapa dedicada à região indicada nesta embalagem. Confira o modo de aplicação e escolha a apresentação que se encaixa na sua rotina.",
  },
  {
    name: /\bolhos?\b|\beyes\b/,
    introduction: "Um cuidado dedicado à região dos olhos.",
    detail: "Inclua esta etapa no seu ritual facial conforme a orientação do fabricante. Aplique somente nas áreas indicadas na embalagem e evite contato direto com os olhos.",
  },
  {
    name: /\bbarb(?:ear)?\b/,
    introduction: "Um momento de cuidado na sua rotina de barbear.",
    detail: "Confira como utilizar esta versão durante o barbear e quais cuidados acompanham a aplicação. Escolha a apresentação que combina com a sua rotina.",
  },
  {
    name: /\bserum\b|\bconcentrate\b/,
    introduction: "Um passo dedicado ao seu ritual de cuidado facial.",
    detail: "Confira a proposta desta versão e a ordem de aplicação indicada na embalagem. A escolha do cuidado facial deve considerar o seu tipo de pele e os demais produtos da rotina.",
  },
  {
    name: /\bcorp(?:oral)?\b|\bbody\b|\bmilk\b|\blotion express\b/,
    introduction: "Transforme o cuidado com o corpo em um momento seu.",
    detail: "Uma opção para acompanhar a rotina de cuidado corporal. Confira a textura, as áreas de aplicação e o modo de uso apresentados pelo fabricante.",
  },
  {
    name: /\bfac(?:ial)?\b|\bface\b|\brevitalift\b|\bliftactiv\b|\bhyalu\b|\bnormaderm\b|\beffaclar\b|\bbright boost\b|\bretinol boost\b|\bantissinais\b/,
    introduction: "Seu momento de cuidado facial começa com uma boa escolha.",
    detail: "Conheça a apresentação desta versão e confira sua indicação para a pele. Inclua o produto na rotina conforme a ordem e a frequência de uso orientadas pelo fabricante.",
  },
  {
    name: /\bhid(?:ratante|ra)?\b|\bhydro ?boost\b|\blipikar loc\b|\bcicaplast baume\b|\bcreme nivea men\b/,
    introduction: "Faça da hidratação um momento de cuidado com você.",
    detail: "Uma opção para compor a sua rotina de cuidado com a pele. Confira a textura e a área de aplicação desta versão para escolher como incluí-la no seu dia.",
  },
];

export function buildPublicProductDescription(product: ProductDescriptionInput): string {
  const description = product.description?.trim();
  if (description && !importedDescription.test(description)) return product.description!;

  const name = product.name.trim();
  const brand = product.brand?.trim();
  const identity = brand && !normalize(name).includes(normalize(brand)) ? `${name}, da ${brand}` : name;
  const medicine = readClassification(product.catalogClassification).kind === "MEDICINE" ||
    product.requiresPrescription || product.isPopularPharmacy ||
    (product.prescriptionType && product.prescriptionType !== "UNREVIEWED") ||
    /medicamento|farmacia popular|generico/.test(normalize(product.category ?? ""));

  if (medicine) {
    return `${identity}.\n\nConfira a apresentação cadastrada e conte com o farmacêutico da Wimifarma para esclarecer dúvidas sobre o produto. Consulte a bula e as orientações do profissional responsável antes de utilizar.`;
  }

  const normalizedName = normalize(name);
  // Exact Brazilian presentation, checked against the manufacturer's page (docs/80).
  if (product.ean?.trim().padStart(14, "0") === "07908966523652" && normalize(brand ?? "") === "vichy" &&
    /^(?:sh|shampoo) (?:vichy )?dercos collagen repair 17 200\s*g$/.test(normalizedName)) {
    return "Seu ritual de reparação começa na lavagem. O Shampoo Vichy Dercos Collagen Repair 17 200 g ajuda a fortalecer os fios e a cuidar dos cabelos danificados.\n\nSua fórmula reúne peptídeos pró-colágeno e ácido cítrico, com textura cremosa e espuma suave para acompanhar a rotina de cuidado capilar.\n\nIndicado para todos os tipos de cabelo. Siga as orientações de aplicação e enxágue da embalagem.";
  }

  const type = productTypes.find(type => type.name.test(normalizedName));
  return [
    type?.introduction ?? "Reserve um momento para cuidar de você.",
    `${identity}. ${type?.detail ?? "Confira a apresentação e as características indicadas na embalagem para escolher o produto que combina com a sua rotina."}`,
    "Na dúvida sobre a escolha, conte com a equipe da Wimifarma. Estamos por perto para ajudar você a conhecer melhor o produto.",
  ].join("\n\n");
}
