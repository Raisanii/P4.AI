const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  // Login
  await page.goto(process.env.BASE_URL + '/login');
  await page.fill('input[name="name"]', 'Aditya Pratama');
  await page.fill('input[name="password"]', '2024002');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');
  await page.waitForTimeout(1000);

  // Check dashboard
  const title = await page.textContent('.dash-title');
  const widgets = await page.$$eval('.widget', els => els.length);
  const gridCols = await page.evaluate(() => {
    const grid = document.querySelector('.dash-grid');
    return grid ? window.getComputedStyle(grid).gridTemplateColumns : 'not found';
  });
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  console.log('Title:', title);
  console.log('Widget count:', widgets);
  console.log('Grid columns at 375px:', gridCols);
  console.log('Scroll width:', scrollWidth, '(should be <= 375)');

  // Also test at 768px (tablet) and 1024px (desktop)
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  const gridCols768 = await page.evaluate(() => {
    const grid = document.querySelector('.dash-grid');
    return grid ? window.getComputedStyle(grid).gridTemplateColumns : 'not found';
  });
  console.log('Grid columns at 768px:', gridCols768);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(500);
  const gridCols1024 = await page.evaluate(() => {
    const grid = document.querySelector('.dash-grid');
    return grid ? window.getComputedStyle(grid).gridTemplateColumns : 'not found';
  });
  console.log('Grid columns at 1024px:', gridCols1024);

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
