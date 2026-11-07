export function CatalogLoading({ search = false }: { search?: boolean }) {
  return (
    <section aria-busy="true" className="bg-surface-subtle pb-16 pt-36 sm:pt-40 lg:pt-56">
      <p className="sr-only" role="status">Carregando produtos…</p>
      <div aria-hidden="true" className={`mx-auto px-4 sm:px-6 lg:px-8 ${search ? "max-w-7xl" : "max-w-[1680px]"}`}>
        <div className="mb-7 h-4 w-32 rounded bg-line/70 motion-safe:animate-pulse" />
        <div className="border-b border-line pb-7">
          <div className="h-10 w-64 max-w-full rounded-lg bg-line/70 motion-safe:animate-pulse" />
          <div className="mt-3 h-5 w-80 max-w-full rounded bg-line/50 motion-safe:animate-pulse" />
        </div>
        <div className={`mt-7 grid items-start gap-6 ${search ? "lg:grid-cols-[minmax(0,1fr)_17rem]" : "lg:grid-cols-[220px_minmax(0,1fr)]"}`}>
          {!search ? <div className="h-14 rounded-2xl border border-line bg-white lg:h-96" /> : null}
          <div className="min-w-0">
            <div className="mb-5 flex h-14 items-end justify-between gap-4">
              <div className="h-5 w-24 rounded bg-line/50 motion-safe:animate-pulse" />
              <div className="h-11 w-40 rounded-lg border border-line bg-white" />
            </div>
            <div className={`grid auto-rows-fr grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 ${search ? "" : "xl:grid-cols-5 xl:gap-3"}`}>
              {Array.from({ length: search ? 6 : 10 }, (_, index) => (
                <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-white" key={index}>
                  <div className="h-40 border-b border-line bg-line/20 motion-safe:animate-pulse sm:h-44" />
                  <div className="space-y-3 p-3">
                    <div className="h-3 w-20 rounded bg-line/50 motion-safe:animate-pulse" />
                    <div className="h-4 w-full rounded bg-line/60 motion-safe:animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-line/60 motion-safe:animate-pulse" />
                    <div className="h-12" />
                    <div className="border-t border-line pt-4">
                      <div className="mb-4 h-7 w-24 rounded bg-line/70 motion-safe:animate-pulse" />
                      <div className="h-11 rounded-lg bg-line/40 motion-safe:animate-pulse" />
                      <div className="mt-2 h-11 rounded-lg bg-line/50 motion-safe:animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {search ? <div className="hidden h-96 rounded-2xl border border-line bg-white lg:block" /> : null}
        </div>
      </div>
    </section>
  );
}
