export function KlocknMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="rgba(124,58,237,0.25)" strokeWidth="1.5"/>
      <path d="M16 2 A14 14 0 0 1 30 16" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 16 A14 14 0 0 1 16 30" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M16 30 A14 14 0 0 1 2 16" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="13" cy="16" r="4.5" fill="rgba(124,58,237,0.28)"/>
      <circle cx="16" cy="13" r="4.5" fill="rgba(249,115,22,0.25)"/>
      <circle cx="19" cy="16" r="4.5" fill="rgba(16,185,129,0.25)"/>
      <line x1="16" y1="16" x2="16" y2="9.5" stroke="#09090B" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="16" x2="21" y2="19" stroke="#09090B" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="1.8" fill="#09090B"/>
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
