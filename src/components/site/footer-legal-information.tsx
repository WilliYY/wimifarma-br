import Link from "next/link";
import { pharmacyLegalDetails, siteConfig, type PharmacyLegalDetails } from "@/lib/site";

const legalLinkStyle = "inline-flex min-h-11 items-center justify-center rounded-sm px-1 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

export function FooterLegalInformation({ details = pharmacyLegalDetails }: { details?: PharmacyLegalDetails }) {
  const { responsiblePharmacist, sanitaryLicense } = details;

  return (
    <section aria-labelledby="footer-legal-title" className="border-t border-line bg-surface-subtle px-5 py-7 text-center text-xs leading-5 text-slate-600 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="sr-only" id="footer-legal-title">Dados legais da farmácia</h2>
        <p className="font-semibold text-slate-700">{siteConfig.name} · {siteConfig.legalName}</p>
        <p className="mt-1">CNPJ {siteConfig.cnpj} · {siteConfig.address} · CEP {siteConfig.postalCode}</p>
        <p className="mt-1">Telefone: <a className="underline decoration-slate-300 underline-offset-2 hover:text-brand focus-visible:outline-brand" href={`tel:+${siteConfig.phone}`}>{siteConfig.displayPhone}</a>{details.openingHours ? ` · ${details.openingHours}` : null}</p>
        {responsiblePharmacist ? <p className="mt-2">Farmacêutico responsável: <span className="font-medium text-slate-700">{responsiblePharmacist.name}</span> · CRF/{responsiblePharmacist.state} {responsiblePharmacist.crf}</p> : null}
        {sanitaryLicense ? <p className="mt-1">Licença sanitária nº {sanitaryLicense.number} · {sanitaryLicense.issuer}{sanitaryLicense.validUntil ? ` · Vencimento: ${sanitaryLicense.validUntil}` : null}</p> : null}
        {details.afe || details.ae ? <p className="mt-1">{details.afe ? `AFE Anvisa: ${details.afe}` : null}{details.afe && details.ae ? " · " : null}{details.ae ? `AE: ${details.ae}` : null}</p> : null}
        <p className="mx-auto mt-4 max-w-3xl">As informações deste site não substituem a orientação de um profissional de saúde. Use medicamentos com orientação e siga as instruções da embalagem e da bula.</p>
        <nav aria-label="Orientações legais e sanitárias" className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-0">
          <Link className={legalLinkStyle} href="/informacoes-legais#atendimento-farmaceutico">Atendimento farmacêutico</Link>
          <Link className={legalLinkStyle} href="/informacoes-legais#receitas">Receitas e dispensação</Link>
          <Link className={legalLinkStyle} href="/informacoes-legais#trocas-e-cancelamentos">Trocas e cancelamentos</Link>
          <Link className={legalLinkStyle} href="/privacidade">Privacidade e dados pessoais</Link>
          <a className={legalLinkStyle} href="https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2021/anvisa-alerta-para-riscos-do-uso-indiscriminado-de-medicamentos" rel="noopener noreferrer" target="_blank">Orientações da Anvisa</a>
          <a aria-label="Consultar no portal da Anvisa" className={legalLinkStyle} href="https://consultas.anvisa.gov.br/#/" rel="noopener noreferrer" target="_blank">Consultas na Anvisa</a>
        </nav>
        <p className="mt-3 border-t border-line pt-4 text-[11px] leading-5">© {new Date().getFullYear()} Wimifarma. Todos os direitos reservados.</p>
      </div>
    </section>
  );
}
