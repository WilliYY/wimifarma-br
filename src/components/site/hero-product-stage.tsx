import Image from "next/image";
import styles from "./hero-product-stage.module.css";

type HeroProductStageProps = {
  variant: "care" | "beauty" | "baby" | "dove" | "rexona" | "nivea";
  priority?: boolean;
};

const careProducts = [
  { src: "/banners/products/dove-oleo.webp", alt: "Óleo de banho Dove Glicerinado", position: "oil" },
  { src: "/banners/nivea-care.webp", alt: "Hidratante corporal NIVEA Milk", position: "lotion" },
  { src: "/banners/rexona-care.webp", alt: "Desodorante Rexona Bamboo", position: "deodorant" },
];

const babyProducts = [
  { src: "/banners/products/huggies-fraldas.webp", alt: "Fraldas Huggies Natural Care", position: "diapers" },
  { src: "/banners/products/johnsons-shampoo.webp", alt: "Shampoo Johnson’s Baby Cabelos Claros", position: "shampoo" },
  { src: "/banners/products/huggies-banho.webp", alt: "Sabonete líquido Huggies Extra Suave", position: "wash" },
];

const productsByVariant = {
  care: careProducts,
  beauty: careProducts,
  baby: babyProducts,
  dove: [careProducts[0], { src: "/banners/products/dove-original.webp", alt: "Sabonete Dove Original", position: "soap" }],
  rexona: [careProducts[2]],
  nivea: [careProducts[1]],
};

const scenesByVariant = {
  care: { src: "/banners/hero-care-people-v3.webp", alt: "Cena ilustrativa de atendimento na Wimifarma" },
  beauty: { src: "/banners/hero-beauty-people-v3.webp", alt: "Cena ilustrativa de autocuidado na perfumaria" },
  baby: { src: "/banners/hero-mae-bebe.webp", alt: "Cena ilustrativa de mãe com seu bebê" },
  dove: { src: "/banners/hero-beauty-people-v3.webp", alt: "Cena ilustrativa de autocuidado com a linha Dove" },
  rexona: { src: "/banners/rexona-people-v3.webp", alt: "Cena ilustrativa de movimento ao ar livre com a linha Rexona" },
  nivea: { src: "/banners/nivea-people-v3.webp", alt: "Cena ilustrativa de cuidado corporal com a linha NIVEA" },
};

export function HeroProductStage({ variant, priority = false }: HeroProductStageProps) {
  const products = productsByVariant[variant];
  const scene = scenesByVariant[variant];

  return (
    <figure className={styles.stage} data-variant={variant}>
      <Image alt={scene.alt} className={styles.person} fill loading={priority ? undefined : "eager"} priority={priority} quality={84} sizes="(max-width: 1359px) 100vw, 1280px" src={scene.src} />
      <div className={styles.products} data-count={products.length}>
        {products.map((product) => (
          <div className={`${styles.product} ${styles[product.position]}`} key={product.src}>
            <Image alt={product.alt} className={styles.packshot} fill loading="eager" quality={84} sizes="(max-width: 767px) 30vw, (max-width: 1359px) 15vw, 190px" src={product.src} />
          </div>
        ))}
      </div>
      <figcaption className={styles.caption}>Consulte versões e disponibilidade.</figcaption>
    </figure>
  );
}
