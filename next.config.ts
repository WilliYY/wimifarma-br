import type { NextConfig } from "next";

const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

// Only the payment document loads the provider's hosted PCI fields and SDK.
const paymentSecurityPolicy = contentSecurityPolicy
  .replace(`script-src ${scriptSources}`, `script-src ${scriptSources} https://sdk.mercadopago.com https://http2.mlstatic.com`)
  // Secure Fields fetches its cache URL before assigning the iframe src;
  // api-static is its official fallback, so both need connect-src as well.
  .replace("connect-src 'self'", "connect-src 'self' https://api.mercadopago.com https://api.mercadolibre.com https://http2.mlstatic.com https://secure-fields.mercadopago.com https://api-static.mercadopago.com")
  .replace("img-src 'self' data: blob: https://lh3.googleusercontent.com", "img-src 'self' data: blob: https://lh3.googleusercontent.com https://http2.mlstatic.com")
  + "; frame-src https://secure-fields.mercadopago.com https://api-static.mercadopago.com";

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000",
  });
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [{ source: "/uploads/products/:fileName", destination: "/api/imagens/produtos/:fileName" }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
        source: "/videos/:path*",
      },
      {
        headers: securityHeaders,
        source: "/:path*",
      },
      {
        headers: [{ key: "Content-Security-Policy", value: paymentSecurityPolicy }, { key: "Referrer-Policy", value: "no-referrer" }],
        source: "/checkout/pagamento/:path*",
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 84],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
