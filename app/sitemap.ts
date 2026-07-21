import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/seo/blog-posts";
import { getAllMarketingPages } from "@/lib/seo/marketing-pages";
import { SITE_URL } from "@/lib/site-metadata";

const STATIC_PUBLIC_ROUTES = ["/", "/careers", "/terms", "/privacy", "/cancellation", "/blog"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries = STATIC_PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));

  const marketingEntries = getAllMarketingPages().map((page) => ({
    url: `${SITE_URL}/${page.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: page.type === "city" ? 0.8 : 0.85,
  }));

  const blogEntries = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.dateModified),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...marketingEntries, ...blogEntries];
}
