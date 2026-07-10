const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

function generateRandomIP() {
  const ranges = [
    [1, 1],
    [2, 2],
    [5, 5],
    [23, 23],
    [27, 27],
    [31, 31],
    [36, 36],
    [37, 37],
    [39, 39],
    [42, 42],
    [46, 46],
    [49, 49],
    [50, 50],
    [60, 60],
    [114, 114],
    [117, 117],
    [118, 118],
    [119, 119],
    [120, 120],
    [121, 121],
    [122, 122],
    [123, 123],
    [124, 124],
    [125, 125],
    [126, 126],
    [180, 180],
    [182, 182],
    [183, 183],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return `${range[0]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

async function downloadInstagram(url) {
  if (!url || !/^(https?:\/\/)?(www\.)?instagram\.com\//i.test(url)) {
    return { success: false, error: "URL Instagram tidak valid" };
  }

  let browser;
  try {
    // Vercel: gunakan executablePath dari @sparticuz/chromium
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      executablePath,
      headless: chromium.headless,
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      protocolTimeout: 0,
    });

    const page = await browser.newPage();
    const spoofedIp = generateRandomIP();
    await page.setExtraHTTPHeaders({
      "X-Forwarded-For": spoofedIp,
      "X-Real-IP": spoofedIp,
      "Client-IP": spoofedIp,
      "True-Client-IP": spoofedIp,
      "X-Originating-IP": spoofedIp,
      "X-Cluster-Client-IP": spoofedIp,
      Forwarded: `for=${spoofedIp}`,
    });
    await page.setViewport({ width: 1280, height: 720 });
    await page.setDefaultNavigationTimeout(0);

    await page.goto("https://snapinsta.to/en", {
      waitUntil: "domcontentloaded",
      timeout: 0,
    });

    // Tunggu Cloudflare selesai
    await page.waitForFunction(
      () => {
        const title = document.title;
        const isChallenge =
          title.includes("Just a moment...") ||
          document.querySelector("#challenge-form") ||
          document.querySelector("#cf-challenge-running");
        return !isChallenge;
      },
      { timeout: 0 },
    );

    await page.waitForSelector("#s_input", { timeout: 0 });
    await page.type("#s_input", url);
    await page.click(".btn-default");

    // Tunggu hasil muncul
    await page.waitForFunction(
      () => {
        const searchResult = document.querySelector("#search-result");
        if (!searchResult) return false;
        const hasError = searchResult.querySelector(".error");
        const hasDownload = searchResult.querySelector(
          'a[href*="snapcdn.app"], a[href*="token="], .download-content a',
        );
        return hasError || hasDownload;
      },
      { timeout: 0 },
    );

    const result = await page.evaluate(() => {
      const searchResult = document.querySelector("#search-result");
      const errorEl = searchResult.querySelector(".error");
      if (errorEl) return { error: errorEl.innerText.trim() };
      const links = [];
      searchResult.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");
        const text = a.innerText.trim();
        if (
          href &&
          href.startsWith("http") &&
          (href.includes("snapcdn") || href.includes("token="))
        ) {
          links.push({ url: href, type: text || "Download" });
        }
      });
      return { links };
    });

    await browser.close();

    if (result.error) return { success: false, error: result.error };
    if (!result.links || result.links.length === 0) {
      return { success: false, error: "Tidak ada link download ditemukan" };
    }
    return { success: true, downloadLinks: result.links };
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return {
      success: false,
      error: error.message || "Gagal mengambil data Instagram",
    };
  }
}

module.exports = { downloadInstagram };
