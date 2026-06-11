import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts, formatDate } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog — Klockn',
  description:
    'Thoughts on group scheduling, AI travel, family planning, and the future of finding time together.',
  openGraph: {
    title: 'Blog — Klockn',
    description:
      'Thoughts on group scheduling, AI travel, family planning, and the future of finding time together.',
    url: 'https://klockn.com/blog',
    siteName: 'Klockn',
  },
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#fff', minHeight: '100vh' }}>
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
        <Link href="/#waitlist" style={{
          background: '#7C3AED', color: '#fff', padding: '8px 20px',
          borderRadius: 100, fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>
          Get early access
        </Link>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '72px 24px 48px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#7C3AED', marginBottom: 16 }}>
          Blog
        </p>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, color: '#0A0A0F', marginBottom: 16 }}>
          Thoughts on time,<br />groups, and AI.
        </h1>
        <p style={{ fontSize: 17, color: '#666', lineHeight: 1.7 }}>
          How we coordinate, travel, and spend time together — and why it's getting easier.
        </p>
      </div>

      {/* Posts */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 120px' }}>
        {posts.length === 0 ? (
          <p style={{ color: '#999', fontSize: 16 }}>No posts yet. Check back soon.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            {posts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <article style={{
                  padding: '36px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.07)',
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>{formatDate(post.date)}</span>
                    <span style={{ fontSize: 12, color: '#ccc' }}>·</span>
                    <span style={{ fontSize: 12, color: '#999' }}>{post.readTime}</span>
                    {post.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{
                        fontSize: 11, fontWeight: 600, color: '#7C3AED',
                        background: 'rgba(124,58,237,0.07)', padding: '2px 10px',
                        borderRadius: 100,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: '#0A0A0F', marginBottom: 10, lineHeight: 1.25 }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, marginBottom: 16 }}>
                    {post.description}
                  </p>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED' }}>
                    Read →
                  </span>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
