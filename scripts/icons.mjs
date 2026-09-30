// Régénère les images PNG (icônes de la PWA, image de partage) à partir des SVG (nécessite ImageMagick)
import { execFileSync } from 'node:child_process'

const run = (src, size, out) => execFileSync('magick', ['-background', 'none', '-density', '384', src, '-resize', size, out])
run('public/icon.svg', '192x192', 'public/icon-192.png')
run('public/icon.svg', '512x512', 'public/icon-512.png')
run('public/icon-maskable.svg', '512x512', 'public/icon-maskable-512.png')
// Image Open Graph (aperçu des liens partagés), source hors de public/ : seul le PNG est servi
run('scripts/og-image.svg', '1200x630!', 'public/og-image.png')
