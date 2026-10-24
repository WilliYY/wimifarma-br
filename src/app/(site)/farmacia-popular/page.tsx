import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, ClipboardCheck, FileText, HeartPulse, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSignature } from "@/components/site/brand-signature";
import { createPublicPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import styles from "./popular.module.css";

export const metadata = createPublicPageMetadata({
  description: "Atendimento para Farmácia Popular em Ivaté-PR com orientação da equipe, conferência de documentos e disponibilidade.",
  path: "/farmacia-popular",
  title: "Farmácia Popular em Ivaté-PR",
});

const steps = [
  { icon: MessageCircle, title: "Converse com a gente", text: "Chame no WhatsApp e conte o que você precisa. A equipe orienta o próximo passo." },
  { icon: FileText, title: "Tenha os documentos em mãos", text: "Separe CPF, documento com foto e receita, quando aplicável. A equipe ajuda com as dúvidas." },
  { icon: ClipboardCheck, title: "Receba a confirmação", text: "Conferimos os requisitos e a disponibilidade antes de combinar a retirada ou entrega." },
];

const checklist = ["CPF e documento com foto", "Receita, quando aplicável", "Nome do medicamento", "Como deseja retirar"];

export default function Page() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}><HeartPulse aria-hidden="true" size={18} /> Cuidado perto de você</p>
            <h1 className={styles.title}>Farmácia <span>Popular</span></h1>
            <p className={styles.lead}>Conte com a Wimifarma para orientar seu atendimento, conferir os documentos e consultar a disponibilidade.</p>
            <div className={styles.actions}>
              <Button asChild className={styles.primaryAction} size="lg">
                <a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={20} /> Falar no WhatsApp <ArrowRight aria-hidden="true" size={18} /></a>
              </Button>
              <a className={styles.secondaryAction} href="#como-funciona">Como funciona <ArrowDown aria-hidden="true" size={17} /></a>
            </div>
            <ul className={styles.assurances}>
              <li><ShieldCheck aria-hidden="true" size={18} /> Orientação da equipe</li>
              <li><Check aria-hidden="true" size={18} /> Disponibilidade conferida</li>
            </ul>
          </div>

          <figure className={styles.figure}>
            <div className={styles.photo}>
              <Image alt="Imagem ilustrativa de uma farmacêutica orientando uma cliente" className={styles.photoImage} fill priority sizes="(min-width: 1280px) 580px, (min-width: 1024px) 48vw, (min-width: 640px) 80vw, calc(100vw - 2rem)" src="/banners/farmacia-popular-atendimento.webp" />
              <div className={styles.photoBrands}>
                <span className={styles.popularSeal}><Image alt="Aqui tem Farmácia Popular" height={160} src="/brand/farmacia-popular.webp" width={160} /></span>
                <BrandSignature />
              </div>
              <div className={styles.photoCaption}>
                <span className={styles.captionIcon}><HeartPulse aria-hidden="true" size={24} /></span>
                <div><strong>Você conta com a nossa equipe.</strong><p>Uma conversa para cuidar de cada etapa.</p></div>
              </div>
            </div>
            <figcaption>Imagem ilustrativa do atendimento.</figcaption>
          </figure>
        </div>
      </section>

      <section aria-labelledby="popular-steps-title" className={`${styles.container} ${styles.stepsSection}`} id="como-funciona">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Simples, do começo ao fim</p><h2 id="popular-steps-title">Como funciona o atendimento</h2></div>
          <p>Comece pelo WhatsApp. A equipe acompanha você nos próximos passos.</p>
        </div>
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return <li key={step.title}>
              <div className={styles.stepTop}><span aria-hidden="true" className={styles.stepNumber}>0{index + 1}</span><Icon aria-hidden="true" size={26} strokeWidth={1.6} /></div>
              <h3>{step.title}</h3><p>{step.text}</p>
            </li>;
          })}
        </ol>
      </section>

      <section className={`${styles.container} ${styles.preparationSection}`}>
        <div className={styles.preparation}>
          <div>
            <p className={styles.eyebrow}><FileText aria-hidden="true" size={18} /> Para facilitar sua conversa</p>
            <h2>Deixe tudo por perto.<br /> A gente orienta você.</h2>
            <p className={styles.preparationLead}>Tenha os dados em mãos e tire suas dúvidas com a equipe antes da separação.</p>
            <Button asChild className={styles.lightAction} size="lg"><a href={siteConfig.whatsappUrl} rel="noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={20} /> Falar no WhatsApp <ArrowRight aria-hidden="true" size={18} /></a></Button>
          </div>
          <div className={styles.checklistPanel}>
            <p className={styles.checklistTitle}>O que ter em mãos</p>
            <ul className={styles.checklist}>{checklist.map(item => <li key={item}><Check aria-hidden="true" size={18} /> {item}</li>)}</ul>
            <p className={styles.confirmation}><ShieldCheck aria-hidden="true" size={18} /> Disponibilidade, requisitos e retirada ou entrega são confirmados pela equipe.</p>
          </div>
        </div>
        <Link className={styles.offersLink} href="/ofertas">Conheça também as ofertas da loja <ArrowRight aria-hidden="true" size={16} /></Link>
      </section>
    </div>
  );
}
