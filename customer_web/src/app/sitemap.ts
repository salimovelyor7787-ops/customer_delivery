import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];

  const staticRoutes = [
    "/",
    "/home",
    "/search",
    "/cart",
    "/checkout",
    "/orders",
    "/profile",
    "/support",
    "/login",
    "/register",
  ];

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: route === "/" ? 1 : 0.7,
  }));
}
