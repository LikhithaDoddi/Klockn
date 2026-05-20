export function KlocknMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="rgba(124,58,237,0.15)" strokeWidth="1.2"/>
      {/* Outer arc segments */}
      <path d="M16 3 A13 13 0 0 1 29 16" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M29 16 A13 13 0 0 1 16 29" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M16 29 A13 13 0 0 1 3 16" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Venn circles */}
      <circle cx="13.5" cy="16" r="3.8" fill="rgba(124,58,237,0.22)"/>
      <circle cx="16" cy="13.5" r="3.8" fill="rgba(249,115,22,0.18)"/>
      <circle cx="18.5" cy="16" r="3.8" fill="rgba(16,185,129,0.18)"/>
      {/* Blue center intersection */}
      <circle cx="16" cy="16" r="2.6" fill="rgba(59,130,246,0.65)"/>
      {/* Clock hands */}
      <line x1="16" y1="16" x2="16" y2="10" stroke="#09090B" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="16" x2="20.5" y2="18.5" stroke="#09090B" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="1.4" fill="#09090B"/>
    </svg>
  )
}

export function KlocknWordmark({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <KlocknMark size={size} />
      <span style={{ fontSize: size * 0.6, fontWeight: 800, letterSpacing: '-0.5px', color: '#09090B' }}>
        klockn
      </span>
    </div>
  )
}
