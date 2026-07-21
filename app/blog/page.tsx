import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BLOG_POSTS } from "@/lib/seo/blog-posts";
import { buildPageMetadata } from "@/lib/seo/metadata-helpers";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-metadata";
import "@/components/seo/seo-marketing.css";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export const metadata: Metadata = buildPageMetadata({
  path: "/blog",
  title: "Trash Can Cleaning Tips & Resources | Bin Blast Co.",
  description:
    "Helpful articles about trash can cleaning, odor control, HOA programs, and professional bin sanitizing across South Metro Atlanta.",
});

export default function BlogIndexPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Blog", url: `${SITE_URL}/blog` },
        ])}
      />
      <Navbar />
      <main className="seo-page">
        <div className="seo-page__container">
          <header className="seo-page__hero">
            <p className="seo-page__eyebrow">Resources</p>
            <h1>Trash Can Cleaning Tips &amp; Resources</h1>
            <p className="seo-page__intro">
              Practical guidance on trash can cleaning, odor control, HOA programs, and professional bin service across South Metro Atlanta.
            </p>
          </header>
          <div className="seo-blog-grid">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="seo-blog-card">
                <h2>{post.h1}</h2>
                <p>{post.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
