import * as React from "react";
import { Img, Section } from "react-email";
import { SITE_URL } from "@/lib/seo";

export const emailLogoPath = "/brand/logo-wimifarma-email-contraste.png";

export function EmailBrand() {
  return (
    <Section style={{ backgroundColor: "#a5082c", borderTop: "4px solid #e6345c", padding: "22px 24px" }}>
      <Img src={`${SITE_URL}${emailLogoPath}`} alt="Wimifarma" width="232" height="65" style={{ display: "block", width: "232px", maxWidth: "100%", height: "auto", borderRadius: "10px", backgroundColor: "#fffaf9", color: "#211b20", fontWeight: 700 }} />
    </Section>
  );
}
