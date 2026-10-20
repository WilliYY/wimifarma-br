// Reviewed topic relationships, not prescribing rules. Sources and limits:
// docs/93-busca-por-assuntos.md. Keep complete ingredient identities.
export type SearchTopic = {
  id: string;
  aliases: string[];
  ingredients: string[];
  namePattern?: string;
};

const painIngredients = ["dipirona monoidratada"];
const diabetesIngredients = ["metformina", "cloridrato de metformina", "glibenclamida", "glimepirida", "fosfato de sitagliptina", "fosfato de sitagliptina monoidratado", "vildagliptina"];

export const searchTopics: SearchTopic[] = [
  { id: "flu", aliases: ["gripe", "gripes", "grip", "influenza"], ingredients: [], namePattern: "grip" },
  { id: "cold", aliases: ["resfriado", "resfriados"], ingredients: [] },
  { id: "headache", aliases: ["dor de cabeca", "dor na cabeca", "dor cabeca", "cabeca", "cefaleia"], ingredients: painIngredients },
  { id: "pain", aliases: ["dor", "dores"], ingredients: painIngredients },
  { id: "fever", aliases: ["febre", "febril"], ingredients: painIngredients },
  { id: "low-pressure", aliases: ["pressao arterial baixa", "pressao baixa", "hipotensao"], ingredients: [] },
  { id: "high-pressure", aliases: ["pressao arterial alta", "pressao alta", "pressao arterial", "pressao", "hipertensao", "hipertensao arterial"],
    ingredients: ["losartana potassica", "maleato de enalapril", "atenolol", "besilato de anlodipino", "carvedilol", "valsartana", "hidroclorotiazida", "clortalidona", "espironolactona", "furosemida"] },
  { id: "diabetes-type1", aliases: ["diabetes tipo 1", "diabete tipo 1", "diabetes tipo1", "diabete tipo1"], ingredients: [] },
  { id: "gestational", aliases: ["diabetes gestacional", "diabete gestacional"], ingredients: [] },
  { id: "prediabetes", aliases: ["pre diabetes", "pre diabete", "prediabetes"], ingredients: [] },
  { id: "hypoglycemia", aliases: ["hipoglicemia", "glicose baixa"], ingredients: [] },
  { id: "diabetes", aliases: ["diabetes tipo 2", "diabete tipo 2", "diabetes tipo2", "diabete tipo2", "diabetes mellitus tipo 2", "diabetes mellitus", "diabetes", "diabete"], ingredients: diabetesIngredients },
  { id: "low-cholesterol", aliases: ["colesterol baixo"], ingredients: [] },
  { id: "cholesterol", aliases: ["colesterol alto", "colesterol elevado", "colesterol", "hipercolesterolemia"],
    ingredients: ["atorvastatina", "atorvastatina calcica", "rosuvastatina", "rosuvastatina calcica", "sinvastatina", "ezetimiba"] },
  { id: "heartburn", aliases: ["azia", "refluxo", "refluxo gastroesofagico"], ingredients: ["omeprazol"] },
];
