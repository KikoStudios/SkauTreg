import { expect, test } from "@playwright/test";

test("public landing has a single primary heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
});

for (const path of ["/privacy", "/tos"]) {
  test(`${path} is usable at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await expect(page.getByText("Obsah dokumentu")).toBeVisible();
  });
}
