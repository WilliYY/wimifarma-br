"use client";

import { useBlackFridayCampaign } from "./black-friday-provider";

export function BlackFridayBadge() {
  if (!useBlackFridayCampaign()) return null;
  return (
    <span data-black-friday-badge className="inline-flex shrink-0 self-start rounded-md border-l-2 border-brand bg-[#171b21] px-1.5 py-1 text-[0.6rem] font-black uppercase leading-none tracking-wide text-white">
      Black Friday
    </span>
  );
}
