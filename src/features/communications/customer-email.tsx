import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text, render } from "react-email";
import { SITE_URL } from "@/lib/seo";
import { buildCustomerMessage, type CustomerMessageData, type CustomerMessageEvent, type CustomerMessageOptions } from "./customer-messages";
import { customerMessageEvents, customerMessageSample, customerMessageSampleOptions } from "./customer-message-samples";

export type CustomerEmailPreviews = Record<CustomerMessageEvent, string>;

/** Server-side template rendering only. No transport, credentials, database or automatic delivery. */
export async function renderCustomerEmail(data: CustomerMessageData, options: CustomerMessageOptions = {}) {
  const message = buildCustomerMessage(data, options);
  if (!message) return null;
  const html = await render(
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{message.subject}</Preview>
      <Body lang="pt-BR" dir="ltr" style={{ backgroundColor: "#f4f5f7", color: "#172033", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "24px 12px" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e2e5eb", borderRadius: "16px", maxWidth: "600px", margin: "0 auto", overflow: "hidden" }}>
          <Section style={{ backgroundColor: "#ffffff", padding: "28px 24px 20px", borderBottom: "4px solid #ca0733" }}>
            <Img src={`${SITE_URL}/brand/logo-wimifarma-email.png`} alt="Wimifarma" width="200" style={{ display: "block", maxWidth: "100%", height: "auto" }} />
          </Section>
          <Section style={{ padding: "12px 24px 24px" }}>
            <Heading as="h1" style={{ fontSize: "22px", lineHeight: "30px", margin: "16px 0 24px", color: "#172033" }}>{message.subject}</Heading>
            {message.lines.map((line, index) => <Text key={index} style={{ fontSize: "15px", lineHeight: "24px", margin: "0 0 12px", overflowWrap: "anywhere" }}>{line}</Text>)}
            <Hr style={{ borderColor: "#e2e5eb", margin: "24px 0 16px" }} />
            <Text style={{ color: "#596579", fontSize: "12px", lineHeight: "20px", margin: 0 }}>Wimifarma · Ivaté, Paraná</Text>
          </Section>
        </Container>
      </Body>
    </Html>,
  );
  return { subject: message.email.subject, text: message.email.text, html };
}

export async function renderSampleEmails(): Promise<CustomerEmailPreviews> {
  const entries = await Promise.all(customerMessageEvents.map(async ({ value }) => {
    const email = await renderCustomerEmail(customerMessageSample(value), customerMessageSampleOptions);
    if (!email) throw new Error("Modelo fictício indisponível.");
    // The administrative srcDoc inherits its page origin and CSP, including in local/staging QA.
    const previewHtml = email.html.replace(`${SITE_URL}/brand/logo-wimifarma-email.png`, "/brand/logo-wimifarma-email.png");
    return [value, previewHtml] as const;
  }));
  return Object.fromEntries(entries) as CustomerEmailPreviews;
}
