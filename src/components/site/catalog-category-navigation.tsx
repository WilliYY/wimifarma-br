import Link from "next/link";
import { Baby, ChevronDown, LayoutGrid, Leaf, Pill, ShieldPlus, Sparkles, Tag } from "lucide-react";
import { catalogCategoryGroups, catalogCategoryNavigationContext, catalogFilterHref, catalogSections } from "@/features/products/catalog-navigation";
import type { CatalogGroup } from "@/features/products/home-shortcuts";

const groupIcons = { baby: Baby, medicines: Pill, vitamins: Leaf, dermo: ShieldPlus, beauty: Sparkles };
const linkClass = "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand aria-[current=page]:bg-brand/5 aria-[current=page]:font-bold aria-[current=page]:text-brand";

export function CatalogCategoryNavigation({ categories, availableSections, path, group, section, offers = false, categorySelected = false }: {
  categories: Parameters<typeof catalogCategoryGroups>[0]; availableSections: string[]; path: string; group?: CatalogGroup; section?: string; offers?: boolean; categorySelected?: boolean;
}) {
  const { groups, others, contextual, selectedCategory, activeGroup } = catalogCategoryNavigationContext(categories, path, group);
  const visibleGroups = offers ? groups.filter(item => item.categories.length > 0) : groups;
  const basePath = path.split("?")[0];
  const changeGroup = (id: string, subsection?: string) => catalogFilterHref(path, { grupo: selectedCategory ? undefined : id, assunto: subsection, ...(offers ? { ofertas: "1" } : {}) }, selectedCategory ? basePath : "/catalogo");

  return <nav aria-label="Categorias de produtos" className="p-3">
    <h2 className="px-3 pb-3 pt-2 text-sm font-bold text-ink">Categorias</h2>
    <div className="space-y-1">
      <Link aria-current={!contextual && !categorySelected && !offers ? "page" : undefined} className={linkClass} href={catalogFilterHref(path, { grupo: undefined, assunto: undefined, ofertas: undefined }, "/catalogo")}><LayoutGrid aria-hidden="true" className="h-4 w-4 shrink-0" />{contextual ? "Catálogo completo" : "Todos os produtos"}</Link>
      <Link aria-current={offers && !group && !categorySelected ? "page" : undefined} className={linkClass} href={catalogFilterHref(path, { grupo: undefined, assunto: undefined, ofertas: undefined }, "/ofertas")}><Tag aria-hidden="true" className="h-4 w-4 shrink-0" />Ofertas</Link>
    </div>
    <div className="my-3 border-t border-line" />
    <div className="space-y-1">
      {visibleGroups.map(item => {
        const children = catalogSections.filter(child => child.group === item.id && availableSections.includes(child.id));
        const Icon = groupIcons[item.id];
        const label = selectedCategory?.name ?? item.label;
        if (!children.length) return <Link aria-current={activeGroup === item.id ? "page" : undefined} className={linkClass} href={changeGroup(item.id)} key={item.id}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{label}</span></Link>;
        return <details className="group/category rounded-xl" key={item.id} name="catalog-category" open={activeGroup === item.id}>
          <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden ${activeGroup === item.id ? "bg-brand/5 text-brand" : "text-ink"}`}>
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{label}</span><ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-open/category:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ul className="mb-2 ml-5 mt-1 space-y-0.5 border-l border-line pl-2">
            <li><Link aria-current={activeGroup === item.id && !section ? "page" : undefined} className={linkClass} href={changeGroup(item.id)}>Ver tudo em {label}</Link></li>
            {children.map(child => <li key={child.id}><Link aria-current={section === child.id ? "page" : undefined} className={linkClass} href={changeGroup(item.id, child.id)}>{child.label}</Link></li>)}
          </ul>
        </details>;
      })}
    </div>
    {others.length ? <div className="mt-3 space-y-1 border-t border-line pt-3">{others.map(category => <Link aria-current={basePath === `/categorias/${category.slug}` ? "page" : undefined} className={linkClass} href={catalogFilterHref(path, { grupo: undefined, assunto: undefined, ...(offers ? { ofertas: "1" } : {}) }, `/categorias/${category.slug}`)} key={category.slug}>{category.name}</Link>)}</div> : null}
  </nav>;
}
