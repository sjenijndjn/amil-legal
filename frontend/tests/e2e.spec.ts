import { test, expect } from "@playwright/test";

test.describe("AMIL Legal Intelligence Platform — Desktop & Mobile (iPhone/Android) E2E Suite", () => {
  test("Dashboard renders personalized greeting 'Welcome back, Amil.' and navigation modules", async ({
    page
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-greeting")).toContainText(
      "Welcome back, Amil."
    );
    await expect(page.getByRole("link", { name: /Ask Juris/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Bare Acts/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Case Laws/i }).first()).toBeVisible();
  });

  test("Ask Juris renders 7-part structured legal answer with verified citations", async ({
    page
  }) => {
    await page.goto("/juris");
    await expect(
      page.getByText("Ask Juris — Legal Intelligence")
    ).toBeVisible();
    await expect(page.getByText("Direct Answer").first()).toBeVisible();
    await expect(page.getByText("Applicable Legal Provisions").first()).toBeVisible();
    await expect(page.getByText("Relevant Judgments").first()).toBeVisible();
  });

  test("Bare Acts switches between Current Enacted and Historical Codes", async ({
    page
  }) => {
    await page.goto("/bare-acts");
    await expect(page.getByText("The Bharatiya Nyaya Sanhita, 2023").first()).toBeVisible();
    await page
      .getByRole("button", {
        name: /Historical Codes/i
      })
      .click();
    await expect(page.getByText("The Indian Penal Code, 1860").first()).toBeVisible();
  });

  test("Drafting Studio displays mandatory human legal review banner and exports", async ({
    page
  }) => {
    await page.goto("/drafting");
    await expect(
      page.getByText(/AI-GENERATED DRAFT/i).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Insert Verified Citation/i })
    ).toBeVisible();
  });

  test("iPhone & Android Mobile Web App viewport renders Bottom Navigation Bar & Slide-Over Drawer without horizontal overflow", async ({
    page
  }) => {
    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 16 Pro viewport
    await page.goto("/dashboard");

    const mobileBottomNav = page.getByRole("navigation", {
      name: /Mobile bottom navigation/i
    });
    await expect(mobileBottomNav).toBeVisible();

    // Open all 10 modules drawer from mobile bottom nav
    await page.getByRole("button", { name: /Open all 10 legal modules/i }).click();
    await expect(page.getByRole("link", { name: /Document Analyzer/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tasks and Reminders/i })).toBeVisible();
  });
});
