export default defineTask({
  meta: {
    name: 'fuel:ingest',
    description: 'Importe le flux open data des prix des carburants',
  },
  async run() {
    const report = await ingestFuelFeed()
    console.info(`[fuel:ingest] ${report.stations} station(s), ${report.prices} prix, ${report.skipped} ignorée(s)`)
    return { result: report }
  },
})
