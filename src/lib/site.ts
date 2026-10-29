import {
  BadgePercent,
  Bike,
  Gift,
  HeartPulse,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const whatsappPhone = "5544984134971";
const whatsappMessage =
  "Olá, tudo bem? Gostaria de falar sobre medicamentos ou da Farmácia Popular";

export const siteConfig = {
  name: "Wimifarma",
  legalName: "W Y Yoshiura Willian Produtos Farmacêuticos e Perfumaria",
  cnpj: "07.676.534/0001-81",
  city: "Ivate-PR",
  phone: whatsappPhone,
  displayPhone: "(44) 98413-4971",
  address: "Avenida Minas Gerais, 2263 - Ivate, Parana",
  postalCode: "87525-000",
  instagramUrl: "https://instagram.com/",
  mapsUrl: "https://maps.app.goo.gl/DFZLnV3ps3Br84PXA",
  reclameAquiUrl: "https://www.reclameaqui.com.br/empresa/w-y-yoshiura-willian-produtos-farmaceuticos-e-perfumaria/",
  whatsappMessage,
  whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    whatsappMessage,
  )}`,
};

export type PharmacyLegalDetails = {
  openingHours: string | null;
  responsiblePharmacist: { name: string; crf: string; state: string } | null;
  sanitaryLicense: { number: string; issuer: string; validUntil?: string } | null;
  afe: string | null;
  ae: string | null;
};

// Publish only fields checked against the establishment's documents.
// An old AFE publication is not proof of the current registration status.
export const pharmacyLegalDetails: PharmacyLegalDetails = {
  openingHours: "Segunda a sábado, das 8h às 18h30. Domingos e plantões: consulte a equipe.",
  responsiblePharmacist: { name: "Willian Yuji Yoshiura", crf: "35373", state: "PR" },
  sanitaryLicense: { number: "029/2026", issuer: "Vigilância Sanitária de Ivaté/PR", validUntil: "15/10/2027" },
  afe: null,
  ae: null,
};

export const publicNavItems = [
  { href: "/catalogo", label: "Produtos" },
  { href: "/farmacia-popular", label: "Farmacia Popular" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export const heroHighlights = [
  "Atendimento rapido no WhatsApp",
  "Campanhas organizadas para a home",
  "Delivery local em Ivate",
];

export const benefitItems = [
  {
    icon: BadgePercent,
    title: "Campanhas com giro comercial",
    description:
      "Estrutura pronta para destacar campanhas, precos promocionais e chamadas para WhatsApp.",
  },
  {
    icon: HeartPulse,
    title: "Cuidado farmaceutico",
    description:
      "Conteudo e rotas preparadas para servicos, orientacao e relacionamento com clientes.",
  },
  {
    icon: Bike,
    title: "Delivery em Ivate",
    description:
      "Fluxo comercial focado em pedido rapido, contato direto e operacao local.",
  },
  {
    icon: Gift,
    title: "Relacionamento e cupons",
    description:
      "Base preparada para campanhas, cupons, leads e recompensas futuras.",
  },
];

export const trustItems = [
  { icon: ShieldCheck, label: "Base pronta para LGPD e auditoria" },
  { icon: MessageCircle, label: "WhatsApp como canal principal" },
  { icon: MapPin, label: "Farmacia local em Ivate-PR" },
  { icon: Sparkles, label: "Campanhas, cupons e cashback futuro" },
];

export const featuredOffers = [
  {
    title: "Higiene e cuidado diario",
    description: "Selecao de produtos essenciais com chamada para atendimento.",
    price: 19.9,
  },
  {
    title: "Vitaminas e bem-estar",
    description: "Campanhas sazonais para aumentar recorrencia de compra.",
    price: 29.9,
  },
  {
    title: "Dermocosmeticos",
    description: "Vitrine premium para produtos de maior valor percebido.",
    price: 39.9,
  },
];
