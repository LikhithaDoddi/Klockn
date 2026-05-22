import Svg, { Circle, Path, Line } from 'react-native-svg'

interface KlocknLogoProps {
  size?: number
}

export function KlocknLogo({ size = 32 }: KlocknLogoProps) {
  const s = size / 32
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="16" r="13" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
      <Path d="M16 3 A13 13 0 0 1 29 16" stroke="rgba(124,58,237,0.9)" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M29 16 A13 13 0 0 1 16 29" stroke="rgba(249,115,22,0.8)" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M16 29 A13 13 0 0 1 3 16" stroke="rgba(16,185,129,0.8)" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="13.5" cy="16" r="3.8" fill="rgba(124,58,237,0.22)" />
      <Circle cx="16" cy="13.5" r="3.8" fill="rgba(249,115,22,0.18)" />
      <Circle cx="18.5" cy="16" r="3.8" fill="rgba(16,185,129,0.18)" />
      <Line x1="16" y1="16" x2="16" y2="10" stroke="rgba(255,255,255,0.68)" strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="16" y1="16" x2="20.5" y2="18.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />
      <Circle cx="16" cy="16" r="1.6" fill="rgba(255,255,255,0.88)" />
    </Svg>
  )
}
