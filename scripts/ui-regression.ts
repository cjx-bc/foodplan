import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const appUrl = process.env.SMARTMEAL_APP_URL ?? "http://127.0.0.1:5173";
const outputDir = path.join(process.cwd(), "output", "playwright");
const defaultViewport = { width: 1440, height: 1200 };

type BrowserSession = {
  close: () => Promise<void>;
  mode: "ephemeral" | "persistent" | "cdp";
  newPage: () => Promise<import("@playwright/test").Page>;
};

async function main() {
  await mkdir(outputDir, { recursive: true });
  const session = await createBrowserSession();
  const page = await session.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon.ico")) {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(appUrl, { waitUntil: "networkidle" });
  await assertNoHorizontalOverflow(page, "overview");
  await page.screenshot({ path: path.join(outputDir, "ui-overview-regression.png"), fullPage: true });

  await page.goto(`${appUrl}/#/chat`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("告诉 AI 你的口味、目标，或问任何饮食问题...").fill("今天清淡，多用库存食材，长文案测试：希望晚餐不要太油，午餐蛋白质足一点。");
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/conversations/") && response.url().includes("/messages") && response.request().method() === "POST"),
    page.getByLabel("发送消息").click(),
  ]);
  await page.waitForLoadState("networkidle");
  await assertNoHorizontalOverflow(page, "chat-after-send");
  await page.screenshot({ path: path.join(outputDir, "ui-chat-runtime-regression.png"), fullPage: true });

  await page.goto(`${appUrl}/#/today`, { waitUntil: "networkidle" });
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/regenerate") && response.request().method() === "POST"),
    page.getByRole("button", { name: /换一个/ }).first().click(),
  ]);
  await assertNoHorizontalOverflow(page, "today-after-swap");

  await page.goto(`${appUrl}/#/weekly`, { waitUntil: "networkidle" });
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/weekly-plans") && response.request().method() === "POST"),
    page.getByRole("button", { name: /生成本周计划|更多偏好设置/ }).first().click(),
  ]);
  await page.getByRole("button", { name: /确认采用/ }).click();
  await page.waitForResponse((response) => response.url().includes("/adopt") && response.request().method() === "POST");
  await assertNoHorizontalOverflow(page, "weekly-after-adopt");
  await page.screenshot({ path: path.join(outputDir, "ui-weekly-regression.png"), fullPage: true });

  await page.goto(`${appUrl}/#/shopping`, { waitUntil: "networkidle" });
  const firstShoppingItem = page.locator("section[aria-label='购物清单'] button").filter({ hasText: /需要/ }).first();
  if (await firstShoppingItem.count()) {
    await firstShoppingItem.click();
    await page.waitForLoadState("networkidle");
  }
  await assertNoHorizontalOverflow(page, "shopping-after-toggle");
  await page.screenshot({ path: path.join(outputDir, "ui-shopping-regression.png"), fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("购物清单").waitFor({ state: "visible" });
  await assertNoHorizontalOverflow(page, "shopping-after-refresh");

  await page.route("**/api/v1/inventory-items", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto(`${appUrl}/#/inventory`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("食材名称").fill("慢响应鸡蛋");
  await page.getByRole("button", { name: /添加食材/ }).click();
  await page.getByRole("button", { name: /添加中/ }).waitFor({ state: "visible" });
  await page.waitForLoadState("networkidle");
  await assertNoHorizontalOverflow(page, "inventory-slow-response");

  await session.close();
  if (consoleErrors.length > 0) {
    throw new Error(`Browser console errors: ${consoleErrors.join(" | ")}`);
  }
  console.log(`SmartMeal UI regression screenshots captured using ${session.mode} browser mode.`);
}

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page, label: string) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (hasOverflow) {
    throw new Error(`Horizontal overflow detected on ${label}`);
  }
}

async function createBrowserSession(): Promise<BrowserSession> {
  const channel = process.env.PLAYWRIGHT_CHANNEL ?? "chrome";
  const headless = parseBooleanEnv(process.env.PLAYWRIGHT_HEADLESS, true);
  const cdpUrl = process.env.PLAYWRIGHT_CDP_URL?.trim();
  const userDataDir = process.env.PLAYWRIGHT_USER_DATA_DIR?.trim();
  const extensionMode = parseBooleanEnv(process.env.PLAYWRIGHT_EXTENSION_MODE, false);

  if (cdpUrl) {
    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error(`No browser context available at PLAYWRIGHT_CDP_URL=${cdpUrl}`);
    }
    return {
      mode: "cdp",
      newPage: async () => {
        const page = context.pages()[0] ?? (await context.newPage());
        await page.setViewportSize(defaultViewport);
        return page;
      },
      close: async () => {
        await browser.close();
      },
    };
  }

  if (extensionMode || userDataDir) {
    const resolvedUserDataDir = userDataDir || path.join(process.cwd(), ".playwright-user-data");
    const context = await chromium.launchPersistentContext(resolvedUserDataDir, {
      channel,
      headless,
      viewport: defaultViewport,
    });
    return {
      mode: "persistent",
      newPage: async () => context.pages()[0] ?? context.newPage(),
      close: async () => {
        await context.close();
      },
    };
  }

  const browser = await chromium.launch({
    channel,
    headless,
  });
  const context = await browser.newContext({ viewport: defaultViewport });
  return {
    mode: "ephemeral",
    newPage: async () => context.newPage(),
    close: async () => {
      await browser.close();
    },
  };
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
