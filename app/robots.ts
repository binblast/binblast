import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/employee/",
          "/operator/",
          "/customer/",
          "/partners/dashboard",
          "/partners/agreement/",
          "/partner/",
          "/careers/dashboard",
          "/careers/apply/confirmation",
          "/login",
          "/register",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/subscription",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
