import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://interview-mate.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/legal/"],
        disallow: [
          "/api/",
          "/resume",
          "/job-posting",
          "/interview-prep",
          "/interview",
          "/result",
          "/mypage",
          "/history",
          "/test",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
