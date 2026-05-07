import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://wimifarma_user:change-me-local-password@localhost:5432/wimifarma_br?schema=public";

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@wimifarma.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-admin-password";
  const passwordHash = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    create: {
      email: adminEmail.toLowerCase(),
      name: process.env.ADMIN_NAME ?? "Wimifarma Admin",
      passwordHash,
      role: "ADMIN",
    },
    update: {
      name: process.env.ADMIN_NAME ?? "Wimifarma Admin",
      passwordHash:
        process.env.ADMIN_RESET_PASSWORD === "true" ? passwordHash : undefined,
      role: "ADMIN",
    },
    where: { email: adminEmail.toLowerCase() },
  });

  const product = await prisma.product.upsert({
    create: {
      category: "Bem-estar",
      description: "Produto demonstrativo para validar ofertas.",
      name: "Produto demonstrativo Wimifarma",
      price: 39.9,
      promotionalPrice: 29.9,
      slug: "produto-demonstrativo-wimifarma",
      status: "ACTIVE",
      stock: 25,
    },
    update: {},
    where: { slug: "produto-demonstrativo-wimifarma" },
  });

  await prisma.offer.upsert({
    create: {
      createdById: admin.id,
      description: "Oferta de exemplo para a landing page e painel admin.",
      highlight: true,
      offerPrice: 29.9,
      originalPrice: 39.9,
      productId: product.id,
      slug: "oferta-demonstrativa",
      status: "ACTIVE",
      title: "Oferta demonstrativa",
      whatsappText:
        "Ola, quero saber mais sobre a oferta demonstrativa da Wimifarma.",
    },
    update: {},
    where: { slug: "oferta-demonstrativa" },
  });

  const coupon = await prisma.coupon.upsert({
    create: {
      code: "WIMI10",
      description: "Cupom demonstrativo para fluxo da roleta.",
      type: "PERCENTAGE",
      value: 10,
    },
    update: {},
    where: { code: "WIMI10" },
  });

  const campaign = await prisma.spinWheelCampaign.upsert({
    create: {
      description: "Campanha de exemplo sem uso comercial real.",
      isActive: false,
      name: "Roleta inaugural",
      slug: "roleta-inaugural",
    },
    update: {},
    where: { slug: "roleta-inaugural" },
  });

  await prisma.spinWheelPrize.upsert({
    create: {
      campaignId: campaign.id,
      couponId: coupon.id,
      label: "10% de desconto",
      probability: 20,
      sortOrder: 1,
    },
    update: {},
    where: {
      campaignId_label: {
        campaignId: campaign.id,
        label: "10% de desconto",
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "seed.completed",
      entity: "system",
      metadata: {
        project: "wimifarma-br",
      },
      userId: admin.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
