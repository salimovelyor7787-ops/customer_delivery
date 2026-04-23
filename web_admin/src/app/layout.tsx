import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const adminSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;
const siteUrl = adminSiteUrl?.replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: adminSiteUrl ? new URL(adminSiteUrl) : undefined,
  title: {
    default: "Minutka Biznes",
    template: "%s | Minutka Biznes",
  },
  description: "Minutka Biznes boshqaruv paneli: admin, restoran va kuryerlar uchun buyurtma boshqaruvi.",
  applicationName: "Minutka Biznes",
  keywords: ["Minutka Biznes", "yetkazib berish", "boshqaruv paneli", "restoran paneli", "kuryer paneli"],
  alternates: {
    canonical: siteUrl ? `${siteUrl}/` : "/",
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: siteUrl ? `${siteUrl}/` : undefined,
    siteName: "Minutka Biznes",
    title: "Minutka Biznes",
    description: "Admin, restoran va kuryerlar uchun buyurtma boshqaruvi paneli.",
  },
  twitter: {
    card: "summary",
    title: "Minutka Biznes",
    description: "Yetkazib berish biznesini boshqarish uchun panel.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        {children}
        <Toaster position="top-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
