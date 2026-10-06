import { APP } from '#shared/app'
import type { YearRecap } from '#shared/recap'
import type { Vehicle } from '#shared/types'

const WIDTH = 1080
const HEIGHT = 1350
const FONT = '"Barlow", system-ui, sans-serif'
const DISPLAY = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, monospace'
// Catppuccin Frappé, comme l'interface
const C = { crust: '#232634', mantle: '#292c3c', base: '#303446', surface0: '#414559', text: '#c6d0f5', subtext: '#a5adce', yellow: '#e5c890' }

interface Tile {
  label: string
  value: string
  detail: string
}

function recapTiles(recap: YearRecap): Tile[] {
  const tiles: Tile[] = [
    { label: 'Distance suivie', value: formatNumber(recap.distance), detail: 'km' },
    {
      label: 'Consommation',
      value: recap.consumption === null ? '—' : formatNumber(recap.consumption, 1),
      detail: 'L/100 km',
    },
    { label: 'Carburant', value: formatEuro(recap.fuelCost, 0), detail: `${recap.fillUps} plein${recap.fillUps > 1 ? 's' : ''}` },
  ]
  if (recap.savings.count) {
    tiles.push({
      label: recap.savings.total >= 0 ? 'Économisé' : 'Surcoût',
      value: formatEuro(Math.abs(recap.savings.total), 0),
      detail: 'face aux prix du coin',
    })
  }
  else {
    tiles.push({ label: 'Coût au km', value: recap.costPerKm === null ? '—' : formatEuro(recap.costPerKm, 3), detail: 'carburant' })
  }
  return tiles
}

/** Image du bilan annuel au format portrait, prête à partager */
export async function drawRecapImage(recap: YearRecap, vehicle: Vehicle, badges: { unlocked: number, total: number }): Promise<Blob> {
  // Les polices de l'appli doivent être chargées avant de dessiner, sinon le canevas prend celles du système
  await Promise.all([`700 100px ${DISPLAY}`, `500 30px ${MONO}`, `500 30px ${FONT}`].map(font => document.fonts.load(font).catch(() => [])))
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(WIDTH / 2, 0, 100, WIDTH / 2, 0, HEIGHT)
  gradient.addColorStop(0, C.base)
  gradient.addColorStop(1, C.crust)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.subtext
  ctx.font = `500 34px ${MONO}`
  ctx.fillText(`${vehicle.make} ${vehicle.model}`.toUpperCase(), 90, 150)
  ctx.fillStyle = C.text
  ctx.font = `700 140px ${DISPLAY}`
  ctx.fillText(`Mon ${recap.year}`, 90, 290)

  const tileWidth = (WIDTH - 90 * 2 - 40) / 2
  const tileHeight = 300
  recapTiles(recap).forEach((tile, index) => {
    const x = 90 + (index % 2) * (tileWidth + 40)
    const y = 360 + Math.floor(index / 2) * (tileHeight + 40)
    ctx.fillStyle = C.mantle
    ctx.strokeStyle = C.surface0
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(x, y, tileWidth, tileHeight, 20)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = C.subtext
    ctx.font = `500 30px ${MONO}`
    ctx.fillText(tile.label.toUpperCase(), x + 40, y + 75, tileWidth - 80)
    ctx.fillStyle = C.yellow
    ctx.font = `700 104px ${DISPLAY}`
    ctx.fillText(tile.value, x + 40, y + 195, tileWidth - 80)
    ctx.fillStyle = C.subtext
    ctx.font = `500 34px ${FONT}`
    ctx.fillText(tile.detail, x + 40, y + 250, tileWidth - 80)
  })

  ctx.fillStyle = C.text
  ctx.font = `700 56px ${DISPLAY}`
  ctx.fillText(`🏅 ${badges.unlocked} badge${badges.unlocked > 1 ? 's' : ''} sur ${badges.total}`, 90, 1130)
  ctx.fillStyle = C.yellow
  ctx.fillRect(90, 1195, 120, 6)
  ctx.fillStyle = C.subtext
  ctx.font = `500 32px ${MONO}`
  ctx.fillText(`${APP.name} · ${APP.tagline}`.toUpperCase(), 90, 1260)

  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image impossible à générer'))), 'image/png'))
}
