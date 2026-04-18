import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://minutka.uz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Minutka",
  description: "Mijozlar uchun ovqat yetkazib berish veb-ilovasi",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Minutka",
    description: "Mijozlar uchun ovqat yetkazib berish veb-ilovasi",
    url: siteUrl,
    siteName: "Minutka",
    locale: "uz_UZ",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        {children}
        <Toaster position="top-right" />
        <SpeedInsights />
      </body>
    </html>
  );
}
