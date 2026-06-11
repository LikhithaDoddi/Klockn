import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllPosts, getPost, formatDate } from '@/lib/blog'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const post = await getPost(params.slug)
    return {
      title: `${post.title} — Klockn Blog`,
      description: post.description,
      keywords: post.tags,
      openGraph: {
        title: post.title,
        description: post.description,
        url: `https://klockn.com/blog/${post.slug}`,
        siteName: 'Klockn',
        type: 'article',
        publishedTime: post.date,
        tags: post.tags,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.description,
      },
      alternates: { canonical: `https://klockn.com/blog/${post.slug}` },
    }
  } catch {
    return { title: 'Post not found — Klockn Blog' }
  }
}

export default async function BlogPost({ params }: Props) {
  let post
  try {
    post = await getPost(params.slug)
  } catch {
    notFound()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'Klockn', url: 'https://klockn.com' },
    publisher: { '@type': 'Organization', name: 'Klockn', url: 'https://klockn.com' },
    url: `https://klockn.com/blog/${post.slug}`,
    keywords: post.tags.join(', '),
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#fff', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        padding: '18px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#0A0A0F' }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="rgba(124,58,237,0.35)" strokeWidth="1.5"/>
            <path d="M16 2 A14 14 0 0 1 30 16" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M30 16 A14 14 0 0 1 16 30" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M16 30 A14 14 0 0 1 2 16" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="16" y1="16" x2="16" y2="9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="16" y1="16" x2="21" y2="19" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="1.8" fill="white"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>klockn</span>
        </Link>
        <Link href="/blog" style={{ fontSize: 13, fontWeight: 500, color: '#666', textDecoration: 'none' }}>
          ← All posts
        </Link>
      </nav>

      {/* Article */}
      <article style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px 120px' }}>
        {/* Meta */}
        <header style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            {post.tags.slice(0, 2).map(tag => (
              <span key={tag} style={{
                fontSize: 11, fontWeight: 600, color: '#7C3AED',
                background: 'rgba(124,58,237,0.07)', padding: '3px 12px',
                borderRadius: 100,
              }}>
                {tag}
              </span>
            ))}
          </div>
          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900,
            letterSpacing: -2, lineHeight: 1.1, color: '#0A0A0F', marginBottom: 20,
          }}>
            {post.title}
          </h1>
          <p style={{ fontSize: 19, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
            {post.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#999', fontSize: 13 }}>
            <span>Klockn</span>
            <span>·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 32 }} />
        </header>

        {/* Body */}
        <div
          className="blog-prose"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* CTA */}
        <div style={{
          marginTop: 72, padding: '40px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(249,115,22,0.04))',
          border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 20, textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#7C3AED', marginBottom: 12 }}>
            Try Klockn
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, color: '#0A0A0F', marginBottom: 10 }}>
            See when everyone is free.
          </h2>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, marginBottom: 28 }}>
            Connect your calendar, build a group, and let Klockn do the rest.
          </p>
          <Link href="/#waitlist" style={{
            display: 'inline-block', background: '#7C3AED', color: '#fff',
            padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 15,
            textDecoration: 'none',
          }}>
            Get early access →
          </Link>
        </div>
      </article>
    </div>
  )
}
