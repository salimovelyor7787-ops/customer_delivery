import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  const robotsSitemap = siteUrl ? `${siteUrl}/sitemap.xml` : "https://www.minut-ka.uz/sitemap.xml";
  const robotsHost = siteUrl ? new URL(siteUrl).host : "www.minut-ka.uz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: ["/api/", "/admin", "/restaurant", "/courier", "/no-access"],
      },
    ],
    sitemap: robotsSitemap,
    host: robotsHost,
  };
}
