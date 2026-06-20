/**
 * Capture docs/screenshots/*.png from the running Next dev server.
 * Usage: npm run dev (or electron:dev) then node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright"
import { mkdir } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, "..", "docs", "screenshots")
const BASE = process.env.COGS_URL ?? "http://localhost:3000"

async function clickTab(page, name) {
  await page.getByRole("tab", { name, exact: true }).click()
  await page.waitForTimeout(600)
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch({
    channel: process.env.PW_CHANNEL ?? "chrome",
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(BASE, { waitUntil: "networkidle" })
  await page.waitForTimeout(1200)

  // --- Home sub-views ---
  await clickTab(page, "Home")
  await clickTab(page, "Habits")
  await page.screenshot({ path: path.join(OUT, "01-home-daily-habits.png"), fullPage: true })

  await clickTab(page, "Plan")
  await page.getByRole("tab", { name: "Month View" }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, "02-home-plan.png"), fullPage: true })

  await clickTab(page, "To Do")
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, "03-home-todo.png"), fullPage: true })

  await clickTab(page, "Goals")
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, "04-home-goals.png"), fullPage: true })

  await clickTab(page, "Tracking")
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, "08-home-tracking.png"), fullPage: true })

  // --- Top-level modules ---
  await clickTab(page, "Lists")
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT, "05-lists.png"), fullPage: true })

  await clickTab(page, "Scheduler")
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, "06-scheduler.png"), fullPage: true })

  await clickTab(page, "Modules")
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, "09-modules.png"), fullPage: true })

  await clickTab(page, "Analytics")
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, "07-analytics.png"), fullPage: true })

  await browser.close()
  console.log("Screenshots saved to", OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
