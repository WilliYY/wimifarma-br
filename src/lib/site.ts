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
  city: "Ivate-PR",
  phone: whatsappPhone,
  displayPhone: "(44) 98413-4971",
  address: "Avenida Minas Gerais, 2263 - Ivate, Parana",
  instagramUrl: "https://instagram.com/",
  mapsUrl: "https://maps.app.goo.gl/DFZLnV3ps3Br84PXA",
  whatsappMessage,
  whatsappUrl: `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    whatsappMessage,
  )}`,
};

export const publicNavItems = [
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
