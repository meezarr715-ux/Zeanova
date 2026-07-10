const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function uploadCatbox(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }

    const fileSize = fs.statSync(filePath).size;
    if (fileSize > 200 * 1024 * 1024) {
      // 200MB batas Catbox
      return { success: false, error: "File terlalu besar (max 200MB)" };
    }

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("userhash", "");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: {
        ...form.getHeaders(),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: "https://catbox.moe",
        Referer: "https://catbox.moe/",
        "Cache-Control": "no-cache",
      },
      timeout: 300000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (data && data.startsWith("https://files.catbox.moe/")) {
      // ===== Gunakan domain kustom zeanova.my.id =====
      const url = data.trim().replace("files.catbox.moe", "zeanova.my.id");
      return { success: true, url };
    } else {
      return { success: false, error: data || "Upload failed" };
    }
  } catch (error) {
    console.error(
      "Catbox upload error:",
      error.response?.data || error.message,
    );
    return {
      success: false,
      error:
        error.response?.data ||
        error.message ||
        "Terjadi kesalahan saat upload",
    };
  }
}

module.exports = { uploadCatbox };
