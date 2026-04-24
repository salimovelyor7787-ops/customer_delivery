/** Same block sizes as the real page to limit CLS during client navigations. */
export default function RestaurantLoading() {
  return (
    <main className="space-y-4 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="h-44 w-full animate-pulse rounded-2xl bg-zinc-200 sm:h-52 lg:h-64 lg:max-h-[22rem]" aria-hidden />
      <div className="h-9 w-48 max-w-[70%] animate-pulse rounded-lg bg-zinc-200" aria-hidden />
      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded-md bg-zinc-200" aria-hidden />
        <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex min-h-[6.5rem] gap-3 rounded-2xl border border-zinc-100 bg-white p-3">
              <div className="h-20 w-20 shrink-0 rounded-xl bg-zinc-200" aria-hidden />
              <div className="flex flex-1 flex-col gap-2 py-0.5">
                <div className="h-4 w-[60%] max-w-[12rem] animate-pulse rounded bg-zinc-200" aria-hidden />
                <div className="h-3 w-full max-w-[16rem] animate-pulse rounded bg-zinc-100" aria-hidden />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
