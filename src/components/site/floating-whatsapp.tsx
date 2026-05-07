import { siteConfig } from "@/lib/site";

function WhatsAppLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="currentColor"
      viewBox="0 0 32 32"
    >
      <path d="M16.02 3.2A12.73 12.73 0 0 0 5.2 22.65L3.6 28.8l6.3-1.58A12.72 12.72 0 1 0 16.02 3.2Zm0 22.9a10.1 10.1 0 0 1-5.14-1.4l-.37-.22-3.72.94.99-3.61-.24-.38A10.12 10.12 0 1 1 16.02 26.1Zm5.75-7.58c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.16-.2.31-.82 1.02-1 1.23-.18.2-.37.23-.68.08-.31-.16-1.32-.49-2.51-1.55-.93-.83-1.56-1.85-1.74-2.16-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.25-.61-.51-.52-.71-.53h-.6c-.2 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.2 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.45.2 1.99.12.61-.09 1.86-.76 2.12-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.2-.6-.35Z" />
    </svg>
  );
}

export function FloatingWhatsApp() {
  return (
    <a
      aria-label="Chamar Wimifarma no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition hover:scale-105 hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      href={siteConfig.whatsappUrl}
      rel="noreferrer"
      target="_blank"
    >
      <WhatsAppLogo />
    </a>
  );
}
