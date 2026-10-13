import { ContourMap } from "@/components/contour-map";
import { currentBrand } from "@/lib/brand";
import { getSettings } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const brand = await currentBrand();
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-line bg-surface lg:block">
        <ContourMap className="absolute inset-0 h-full w-full" />
        <div className="relative flex h-full flex-col justify-between p-12">
          {!brand.custom && (await getSettings()).platform_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/logo" alt={brand.name} className="h-9 w-auto max-w-[200px] object-contain" />
          ) : (
            <p className="text-lg font-semibold">{brand.name}</p>
          )}
          <div className="max-w-md">
            <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em]">
              {brand.custom ? "Welcome back." : "Every business on the map, one list away."}
            </h1>
            <p className="mt-4 text-muted">
              Search any city for the businesses you sell to, keep the ones that fit, and reach out from one place.
            </p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}
