import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { resolveViewport, DEVICE_PRESETS } from "./device-presets.js";

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

export class HtmlRenderer {
  constructor() {
    this.browser = null;
  }

  async init() {
    let executablePath = process.env.CHROME_PATH || null;

    if (!executablePath) {
      for (const p of CHROME_PATHS) {
        try {
          fs.accessSync(p);
          executablePath = p;
          break;
        } catch { /* skip */ }
      }
    }

    if (!executablePath) {
      throw new Error(
        "Chrome/Chromium not found. Set CHROME_PATH environment variable to your Chrome executable path."
      );
    }

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
  }

  async render(html, options = {}) {
    if (!this.browser) {
      throw new Error("HtmlRenderer not initialized. Call init() first.");
    }

    const { device, width, height } = options;
    const viewport = resolveViewport(device, width, height);

    const page = await this.browser.newPage();
    try {
      await page.setViewport(viewport);
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 10000 });
      // Brief settle time for CSS rendering
      await new Promise(r => setTimeout(r, 200));

      const pngBuffer = await page.screenshot({
        type: "png",
        fullPage: false,
      });

      return {
        pngBuffer,
        width: viewport.width * viewport.deviceScaleFactor,
        height: viewport.height * viewport.deviceScaleFactor,
      };
    } finally {
      await page.close();
    }
  }

  toDataUri(pngBuffer) {
    const base64 = Buffer.from(pngBuffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getAvailableDevices() {
    return Object.entries(DEVICE_PRESETS).map(([key, val]) => ({
      id: key,
      label: val.label,
      width: val.width,
      height: val.height,
    }));
  }
}
