import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text, render } from "react-email";
import { SITE_URL } from "@/lib/seo";

const messages = {
  recovery: {
    subject: "Recupere sua senha da Wimifarma",
    instruction: "Copie o código abaixo e use-o para escolher uma nova senha para a sua conta.",
    path: "/recuperar-senha?codigo=1",
    action: "Redefinir minha senha",
  },
  verification: {
    subject: "Confirme seu e-mail na Wimifarma",
    instruction: "Copie o código abaixo e volte à sua conta para confirmar este e-mail e habilitar a recuperação de senha.",
    path: "/minha-conta#seguranca",
    action: "Voltar à minha conta",
  },
};

export const passwordRecoveryCodePattern = /^[A-Za-z0-9_-]{43}$/;

export async function renderPasswordRecoveryEmail(token: string, kind: keyof typeof messages = "recovery") {
  if (!passwordRecoveryCodePattern.test(token)) return null;

  const { subject, instruction, path, action } = messages[kind];
  const href = `${SITE_URL}${path}`;
  const expiry = "O código vale por 15 minutos e pode ser usado uma única vez.";
  const ignored = "Se você não fez este pedido, pode ignorar este e-mail.";
  const html = await render(
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: "#f6f5f6", color: "#172033", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "24px 12px" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e2e5eb", borderRadius: "16px", maxWidth: "560px", overflow: "hidden" }}>
          <Section style={{ padding: "24px", borderBottom: "3px solid #ca0733" }}>
            <Img src={`${SITE_URL}/brand/logo-wimifarma-email.png`} alt="Wimifarma" width="180" style={{ display: "block", maxWidth: "100%", height: "auto" }} />
          </Section>
          <Section style={{ padding: "24px" }}>
            <Heading as="h1" style={{ fontSize: "25px", lineHeight: "32px", margin: "0 0 16px" }}>{subject}</Heading>
            <Text style={{ fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" }}>{instruction}</Text>
            <Section style={{ backgroundColor: "#fff4f6", border: "1px solid #f2d1da", borderRadius: "10px", padding: "12px 14px" }}>
              <Text style={{ fontSize: "13px", color: "#7b1931", margin: "0 0 6px" }}>Seu código</Text>
              <Text style={{ fontSize: "15px", lineHeight: "22px", fontWeight: 700, fontFamily: "Consolas, monospace", wordBreak: "break-all", margin: 0 }}>{token}</Text>
            </Section>
            <Button href={href} style={{ backgroundColor: "#ca0733", borderRadius: "8px", color: "#ffffff", fontSize: "15px", fontWeight: 700, marginTop: "20px", padding: "12px 18px" }}>{action}</Button>
            <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "16px 0 0" }}>{expiry}</Text>
            <Text style={{ fontSize: "14px", lineHeight: "22px", margin: "8px 0 0" }}>{ignored}</Text>
            <Hr style={{ borderColor: "#e2e5eb", margin: "24px 0 12px" }} />
            <Text style={{ color: "#596579", fontSize: "12px", margin: 0 }}>Wimifarma · Ivaté, Paraná</Text>
          </Section>
        </Container>
      </Body>
    </Html>,
  );

  return { subject, html, text: [subject, instruction, token, `${action} ${href}`, expiry, ignored, "Wimifarma · Ivaté, Paraná"].join("\n\n") };
}
