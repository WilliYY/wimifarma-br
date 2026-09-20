import Image from "next/image";
import styles from "./hero-product-stage.module.css";

type HeroProductStageProps = {
  variant: "care" | "beauty" | "baby";
  priority?: boolean;
};

const careProducts = [
  { src: "/banners/products/dove-oleo.webp", alt: "Óleo de banho Dove Glicerinado", position: "oil" },
  { src: "/banners/nivea-care.webp", alt: "Hidratante corporal NIVEA Milk", position: "lotion" },
  { src: "/banners/rexona-care.webp", alt: "Desodorante Rexona Bamboo", position: "deodorant" },
  { src: "/banners/products/dove-original.webp", alt: "Sabonete em barra Dove Original", position: "soap" },
];

const babyProducts = [
  { src: "/banners/products/huggies-fraldas.webp", alt: "Fraldas Huggies Natural Care", position: "diapers" },
  { src: "/banners/products/johnsons-shampoo.webp", alt: "Shampoo Johnson’s Baby Cabelos Claros", position: "shampoo" },
  { src: "/banners/products/huggies-banho.webp", alt: "Sabonete líquido Huggies Extra Suave", position: "wash" },
  { src: "/banners/products/huggies-condicionador.webp", alt: "Condicionador Huggies Extra Suave", position: "conditioner" },
];

export function HeroProductStage({ variant, priority = false }: HeroProductStageProps) {
  const isBaby = variant === "baby";
  const products = isBaby ? babyProducts : careProducts;

  return (
    <figure className={`${styles.stage} ${styles[variant]}`}>
      <p className={styles.brands}>{isBaby ? "Huggies · Johnson’s" : "Dove · NIVEA · Rexona"}</p>
      {products.map((product) => (
        <div className={`${styles.product} ${styles[product.position]}`} key={product.src}>
          <Image
            alt={product.alt}
            className={styles.packshot}
            fill
            loading={priority ? undefined : "eager"}
            priority={priority}
            quality={84}
            sizes="(max-width: 639px) 40vw, (max-width: 1023px) 32vw, 280px"
            src={product.src}
          />
        </div>
      ))}
      <figcaption className={styles.caption}>Consulte versões e disponibilidade.</figcaption>
    </figure>
  );
}
