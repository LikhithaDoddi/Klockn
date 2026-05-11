const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Check if sharp is available, install if not
try {
  require.resolve('sharp')
} catch {
  console.log('Installing sharp...')
  execSync('npm install sharp --no-save', { stdio: 'inherit' })
}

const sharp = require('sharp')

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#09090B"/>
  <circle cx="16" cy="16" r="13" stroke="rgba(124,58,237,0.25)" stroke-width="1.5"/>
  <path d="M16 3 A13 13 0 0 1 29 16" stroke="#7C3AED" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M29 16 A13 13 0 0 1 16 29" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M16 29 A13 13 0 0 1 3 16" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="13.5" cy="16" r="4" fill="rgba(124,58,237,0.35)"/>
  <circle cx="16" cy="13.5" r="4" fill="rgba(249,115,22,0.3)"/>
  <circle cx="18.5" cy="16" r="4" fill="rgba(16,185,129,0.3)"/>
  <line x1="16" y1="16" x2="16" y2="9.5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="16" y1="16" x2="21" y2="19" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="1.8" fill="white"/>
</svg>`

const svgBuffer = Buffer.from(svgContent)

async function generate() {
  // icon.png — 1024x1024
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(__dirname, 'assets', 'icon.png'))
  console.log('Generated icon.png (1024x1024)')

  // splash.png — 1284x2778 with purple background
  await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 124, g: 58, b: 237, alpha: 1 }
    }
  })
  .composite([{
    input: await sharp(svgBuffer).resize(400, 400).png().toBuffer(),
    gravity: 'centre'
  }])
  .png()
  .toFile(path.join(__dirname, 'assets', 'splash.png'))
  console.log('Generated splash.png (1284x2778)')

  // adaptive icon foreground — 1024x1024 with transparency
  await sharp(svgBuffer)
    .resize(768, 768)
    .extend({ top: 128, bottom: 128, left: 128, right: 128, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, 'assets', 'adaptive-icon.png'))
  console.log('Generated adaptive-icon.png (1024x1024)')
}

generate().catch(console.error)
