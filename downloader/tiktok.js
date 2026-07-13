/**
 * Base  : https://play.google.com/store/apps/details?id=com.universal.video.downloader
 * Fitur : Downloader TikTok v2 — no watermark, HD, audio, slide, + metadata
 **/

"use strict";

const axios = require("axios");
const crypto = require("crypto");

const BASE_URL = "https://appdl.pro/";
const APP_VERSION = "1.55";

const SSS_SALT = "ssstik.io";
const SSS_KEY = "b0lF_14022023_DK";

const client = axios.create({ baseURL: BASE_URL });

function simpleIntStrConvert(text) {
  let out = "";
  for (const ch of text.split("")) {
    out += String(ch.charCodeAt(0)).padStart(3, "0");
  }
  return out;
}

function md5(str) {
  return crypto
    .createHash("md5")
    .update(Buffer.from(str, "utf8"))
    .digest("hex");
}

function generateTs() {
  return String(Math.floor(Date.now() / 1000 / 60));
}

function generateTt(id, ts) {
  const raw = ts + APP_VERSION + id + SSS_SALT + SSS_KEY;
  const conv = simpleIntStrConvert(raw);
  return md5(String(conv.length) + conv);
}

function buildUserAgent(ip = "192.168.0.101") {
  return `ssstik.io/${APP_VERSION}/${ip}/(com.universal.video.downloader)`;
}

const cookieStore = {};

function grabCookies(res) {
  const setCookie = res.headers?.["set-cookie"];
  if (!Array.isArray(setCookie)) return;
  for (const c of setCookie) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0)
      cookieStore[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
}

function cookieHeader() {
  const keys = Object.keys(cookieStore);
  return keys.length
    ? keys.map((k) => `${k}=${cookieStore[k]}`).join("; ")
    : null;
}

async function fetchInfo(id, hd = false) {
  const ts = generateTs();
  const tt = generateTt(id, ts);

  const payload = new URLSearchParams({ id, locale: "en", tt, ts }).toString();

  const cookie = cookieHeader();
  const res = await client.post(hd ? "1/fetch?hd" : "1/fetch", payload, {
    headers: {
      "user-agent": buildUserAgent(),
      authorization:
        "d9a97b094b5a1cdbfaab98d117031de5f01e4faec165c5a6bdc452d1a52fc268",
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      "accept-encoding": "gzip",
      ...(cookie ? { cookie } : {}),
    },
    decompress: true,
    validateStatus: () => true,
  });

  grabCookies(res);
  return res.data;
}

function formatResult(d) {
  const isImage =
    d.type === 2 || (typeof d.slides === "string" && d.slides.length > 0);
  return {
    id: d.itemId,
    type: isImage ? "image" : "video",
    title: d.text || null,
    author: {
      id: d.author_id,
      username: d.author_unique_id,
      nickname: d.author_nickname,
      avatar: d.author_cover_link || null,
    },
    stats: {
      views: d.play_count,
      likes: d.like_count,
      comments: d.comment_count,
      shares: d.share_count,
    },
    duration: d.duration,
    create_time: d.create_time,
    cover: d.cover_link || d.origin_cover || null,
    music: d.music_link || null,
    download: {
      no_watermark: d.no_watermark_link || null,
      no_watermark_hd: d.no_watermark_link_hd || null,
      watermark: d.watermark_link || null,
    },
    slides: d.slides ? d.slides : null,
    original: d.original || null,
  };
}

const tiktokDownloaderV2 = async (url, options = {}) => {
  try {
    if (!url || !/tiktok\.com/i.test(url))
      throw new Error("URL TikTok tidak valid");

    const data = await fetchInfo(url, false);
    if (!data || !data.itemId) {
      const msg =
        data?.error?.message ||
        "Gagal mengambil data (token/URL ditolak server)";
      throw new Error(msg);
    }

    const result = formatResult(data);

    if (options.hd && !result.download.no_watermark_hd) {
      const hdData = await fetchInfo(url, true);
      if (hdData?.no_watermark_link_hd) {
        result.download.no_watermark_hd = hdData.no_watermark_link_hd;
      }
    }

    return {
      status: true,
      result,
      cookies: cookieHeader(),
    };
  } catch (error) {
    const msg = error.response
      ? `HTTP ${error.response.status}`
      : error.message;
    console.error("Error Main Process:", msg);
    return { status: false, error: msg };
  }
};

module.exports = { downloadTiktok: tiktokDownloaderV2 };
