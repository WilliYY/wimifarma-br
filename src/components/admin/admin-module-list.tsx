type AdminModuleListProps = {
  items: string[];
};

export function AdminModuleList({ items }: AdminModuleListProps) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold leading-6 text-ink shadow-sm"
          key={item}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
