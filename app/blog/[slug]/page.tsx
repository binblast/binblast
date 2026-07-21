import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { BLOG_POSTS, getBlogPost } from "@/lib/seo/blog-posts";
import { buildPageMetadata } from "@/lib/seo/metadata-helpers";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-metadata";
import "@/components/seo/seo-marketing.css";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface BlogPostPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  return buildPageMetadata({
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.description,
  });
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const pageUrl = `${SITE_URL}/blog/${post.slug}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Blog", url: `${SITE_URL}/blog` },
            { name: post.h1, url: pageUrl },
          ]),
          articleSchema({
            title: post.h1,
            description: post.description,
            url: pageUrl,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
          }),
        ]}
      />
      <Navbar />
      <main className="seo-page">
        <article className="seo-page__container">
          <header className="seo-page__hero">
            <p className="seo-page__eyebrow">Updated {post.dateModified}</p>
            <h1>{post.h1}</h1>
          </header>
          {post.sections.map((section) => (
            <section key={section.heading} className="seo-section">
              <h2 className="seo-section__title">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="seo-section__text">
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="seo-section__list">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          <section className="seo-section">
            <h2 className="seo-section__title">Related Services</h2>
            <div className="seo-links-grid">
              {post.relatedLinks.map((link) => (
                <Link key={link.href} href={link.href} className="seo-link-card">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </article>
      </main>
    </>
  );
}
