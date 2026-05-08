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

export const siteConfig = {
  name: "Wimifarma",
  city: "Ivate-PR",
  phone: "5544999999999",
  displayPhone: "(44) 99999-9999",
  address: "Ivate, Parana",
  instagramUrl: "https://instagram.com/",
  whatsappUrl:
    "https://wa.me/5544999999999?text=Ola%2C%20vim%20pelo%20site%20da%20Wimifarma%20e%20quero%20atendimento.",
};

export const publicNavItems = [
  { href: "/ofertas", label: "Ofertas" },
  { href: "/farmacia-popular", label: "Farmacia Popular" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export const heroHighlights = [
  "Atendimento rapido no WhatsApp",
  "Ofertas organizadas por campanha",
  "Delivery local em Ivate",
];

export const benefitItems = [
  {
    icon: BadgePercent,
    title: "Ofertas com giro comercial",
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
