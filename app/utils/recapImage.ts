import { APP } from '#shared/app'
import type { YearRecap } from '#shared/recap'
import type { Vehicle } from '#shared/types'

const WIDTH = 1080
const HEIGHT = 1350
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

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
export function drawRecapImage(recap: YearRecap, vehicle: Vehicle, badges: { unlocked: number, total: number }): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  gradient.addColorStop(0, APP.themeColor)
  gradient.addColorStop(1, '#0f172a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 44px ${FONT}`
  ctx.globalAlpha = 0.75
  ctx.fillText(`${vehicle.make} ${vehicle.model}`, 90, 150)
  ctx.globalAlpha = 1
  ctx.font = `800 120px ${FONT}`
  ctx.fillText(`Mon ${recap.year}`, 90, 280)

  const tileWidth = (WIDTH - 90 * 2 - 40) / 2
  const tileHeight = 300
  recapTiles(recap).forEach((tile, index) => {
    const x = 90 + (index % 2) * (tileWidth + 40)
    const y = 360 + Math.floor(index / 2) * (tileHeight + 40)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.beginPath()
    ctx.roundRect(x, y, tileWidth, tileHeight, 36)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.75
    ctx.font = `600 36px ${FONT}`
    ctx.fillText(tile.label, x + 40, y + 75)
    ctx.globalAlpha = 1
    ctx.font = `800 88px ${FONT}`
    ctx.fillText(tile.value, x + 40, y + 190, tileWidth - 80)
    ctx.globalAlpha = 0.75
    ctx.font = `500 34px ${FONT}`
    ctx.fillText(tile.detail, x + 40, y + 250, tileWidth - 80)
    ctx.globalAlpha = 1
  })

  ctx.font = `700 48px ${FONT}`
  ctx.fillText(`🏅 ${badges.unlocked} badge${badges.unlocked > 1 ? 's' : ''} sur ${badges.total}`, 90, 1130)
  ctx.globalAlpha = 0.75
  ctx.font = `500 38px ${FONT}`
  ctx.fillText(`${APP.name} · ${APP.tagline.toLowerCase()}`, 90, 1250)
  ctx.globalAlpha = 1

  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image impossible à générer'))), 'image/png'))
}
