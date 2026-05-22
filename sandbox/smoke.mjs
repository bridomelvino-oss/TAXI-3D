import { chromium } from "playwright";

const url = "http://127.0.0.1:5179/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 440, height: 820 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE.ERROR: " + m.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// Initial screenshot
await page.screenshot({ path: "shot-1-initial.png", fullPage: true });

// Try to click the first player unit (gatherer) cell
const cells = await page.locator('div[style*="cursor:pointer"], div[style*="cursor: pointer"]').all();
console.log("cells found:", cells.length);

// Use locator on the grid: tap a player gatherer at (1,0)
// The grid is 8x8 so cell index 1 = (x=1,y=0). Look for SVG sprite of player (green).
const sprites = page.locator("svg circle[fill='#3cb371']");
const ct = await sprites.count();
console.log("green body sprites:", ct);

if (ct > 0) {
  // Click the parent cell of the first green sprite
  await sprites.first().locator("xpath=ancestor::div[contains(@style,'cursor')][1]").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shot-2-selected.png", fullPage: true });

  // Click "Déplacer" button
  const moveBtn = page.getByRole("button", { name: /Déplacer/ });
  if (await moveBtn.count()) {
    await moveBtn.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "shot-3-move-mode.png", fullPage: true });
  }

  // Click "FIN DE TOUR"
  const endBtn = page.getByRole("button", { name: /FIN DE TOUR/ });
  if (await endBtn.count()) {
    await endBtn.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "shot-4-after-turn.png", fullPage: true });
  }
}

console.log("ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
