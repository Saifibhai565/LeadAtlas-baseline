import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { BrandProvider } from "@/components/brand";
import { I18nProvider } from "@/components/i18n-provider";
import { ErrorReporter } from "@/components/error-reporter";
import { RegisterServiceWorker } from "@/components/pwa";
import { currentBrand, hexToRgbVar } from "@/lib/brand";
import { getSettings } from "@/lib/settings";
import { APP_NAME } from "@/lib/utils";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const brand = await currentBrand();
  const s = await getSettings();
  const title = brand.custom ? brand.name : s.seo_title || brand.name;
  return {
    ...metadata,
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    title: { default: title, template: `%s · ${brand.name}` },
    description: s.seo_description || metadata.description,
    keywords: s.seo_keywords ? s.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    applicationName: brand.name,
    icons: s.platform_favicon ? { icon: "/brand/favicon", apple: "/brand/favicon" } : metadata.icons,
    openGraph: {
      title,
      description: s.seo_description || undefined,
      siteName: brand.name,
      type: "website",
      ...(s.og_image ? { images: [{ url: "/brand/og" }] } : {}),
    },
    twitter: { card: s.og_image ? "summary_large_image" : "summary", title, description: s.seo_description || undefined },
  };
}

const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Find local businesses, organise them as leads and reach out.",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport = { themeColor: "#0C131F" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // White, professional theme by default; people can switch to dark in Settings
  const jar = await cookies();
  const theme = jar.get("theme")?.value === "dark" ? "dark" : "light";
  const lang = jar.get("lang")?.value === "ur" ? "ur" : "en";
  const brand = await currentBrand();
  const accent = hexToRgbVar(brand.color);
  return (
    <html
      lang={lang}
      dir={lang === "ur" ? "rtl" : "ltr"}
      className={sans.variable}
      data-theme={theme}
      style={accent ? ({ "--pin": accent } as React.CSSProperties) : undefined}
    >
      <body className="min-h-screen font-sans text-[15px] leading-6">
        <BrandProvider value={{ name: brand.name, custom: brand.custom, logo: !brand.custom && Boolean((await getSettings()).platform_logo) }}>
          <I18nProvider lang={lang}>{children}</I18nProvider>
        </BrandProvider>
        <RegisterServiceWorker />
        <ErrorReporter />
        <Toaster
          theme={theme}
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgb(var(--raised))",
              border: "1px solid rgb(var(--line))",
              color: "rgb(var(--ink))",
            },
          }}
        />
      </body>
    </html>
  );
}
