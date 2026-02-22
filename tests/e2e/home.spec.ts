import { test, expect } from "@playwright/test";

test("home renders primary hero and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Controla tus subastas/i })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Solicitar demo/i })).toBeVisible();
  await expect(page.getByText(/Publicar equipo/i).first()).toBeVisible();
});

test("navigation anchors exist", async ({ page }) => {
  await page.goto("/");
  const anchors = ["#inicio", "#nosotros", "#catalogo", "#ofertas", "#contacto"];
  for (const anchor of anchors) {
    await expect(page.locator(anchor)).toBeAttached();
  }
});

test("catalog renders auction cards", async ({ page }) => {
  await page.goto("/#catalogo");
  await expect(page.getByText(/Subastas activas hoy/i)).toBeVisible();
});

test("contact section shows SLP location", async ({ page }) => {
  await page.goto("/#contacto");
  await expect(page.getByText(/San Luis Potosí/i).first()).toBeVisible();
});

test("whatsapp link exists", async ({ page }) => {
  await page.goto("/");
  const waLinks = page.locator('a[href*="wa.me/524442164550"]');
  await expect(waLinks.first()).toBeAttached();
});

test("admin panel loads", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText(/Panel de administración/i)).toBeVisible();
});

test("bottom nav visible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const bottomNav = page.locator("nav.fixed.bottom-0");
  await expect(bottomNav).toBeVisible();
});

test("video banner exists in hero", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("video");
  await expect(video).toBeAttached();
});
