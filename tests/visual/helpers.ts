import type { Page } from "@playwright/test";

/** The compact layout keeps secondary controls behind the roaming menu. */
export async function clickSceneTool(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  if (!(await button.isVisible()))
    await page
      .getByRole("button", { name: "展开漫游工具", exact: true })
      .click();
  await button.click();
}
