const { createWriteStream } = require("fs");
const { pipeline } = require("stream/promises");
const path = require("path");
const fs = require("fs");

const API_HOST = "epsilon.epsiloncloud.org";
const FRONTEND = "https://convertytmp3.org";

const BASE_HEADERS = {
  Origin: FRONTEND,
  Referer: `${FRONTEND}/`,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
  Accept: "*/*",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
};

function extractVideoId(url) {
  const re =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|live\/|shorts\/)|[?&]v=)([a-zA-Z0-9-_]{11})/;
  const match = url.match(re);
  return match ? match[1] : null;
}

async function callApi(url, auth, retry = 0) {
  const headers = { ...BASE_HEADERS };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const response = await fetch(url, { headers });
  if (response.status === 403 && retry < 3) {
    await new Promise((r) => setTimeout(r, 2000));
    return callApi(url, auth, retry + 1);
  }
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return JSON.parse(body);
}

async function downloadYoutube(url, format, tempDir) {
  try {
    const id = extractVideoId(url);
    if (!id) throw new Error("URL YouTube tidak valid");

    const { key } = await callApi(
      `https://${API_HOST}/api/v1/auth?_=${Date.now()}`,
    );
    console.log("→ Handshake ok");

    const session = await callApi(
      `https://${API_HOST}/api/v1/init?_=${Date.now()}`,
      key,
    );
    console.log("→ Session started");

    let step = await callApi(
      `${session.convertURL}&v=${id}&f=${format}&_=${Date.now()}`,
    );
    while (step.redirectURL) {
      step = await callApi(
        `${step.redirectURL}&v=${id}&f=${format}&_=${Date.now()}`,
      );
    }

    let { progressURL, downloadURL } = step;
    let title = step.title || "video";

    const STAGES = ["checking", "extracting", "converting", "ready"];
    if (progressURL) {
      let last = -1;
      while (true) {
        await new Promise((r) => setTimeout(r, 3000));
        const p = await callApi(`${progressURL}&_=${Date.now()}`);
        if (p.title) title = p.title;
        if (p.progress !== undefined && p.progress !== last) {
          console.log(`  [${p.progress}] ${STAGES[p.progress] || "..."}`);
          last = p.progress;
        }
        if (p.downloadURL) downloadURL = p.downloadURL;
        if (last >= 3) break;
      }
    }

    const filename = `${(title || id).replace(/[/\\?%*:|"<>]/g, "_")}.${format}`;
    const filePath = path.join(tempDir, filename);

    console.log(`→ Mengunduh: ${filename}`);
    const dlResponse = await fetch(`${downloadURL}&v=${id}&f=${format}&r=cli`, {
      headers: BASE_HEADERS,
      redirect: "follow",
    });
    if (!dlResponse.ok) throw new Error(`Download gagal: ${dlResponse.status}`);

    await pipeline(dlResponse.body, createWriteStream(filePath));

    const stats = await fs.promises.stat(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      data: {
        title,
        size: `${sizeMB} MB`,
        filename,
        filePath,
        downloadUrl: null, // tidak digunakan
      },
    };
  } catch (err) {
    console.error("YouTube download error:", err);
    return { success: false, message: err.message };
  }
}

module.exports = { downloadYoutube };
