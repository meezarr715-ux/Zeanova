const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function uploadCatbox(filePath, retry = 0) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("userhash", "");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: {
        ...form.getHeaders(),
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
      },
      timeout: 120000, // 2 menit
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (data && data.startsWith("https://files.catbox.moe/")) {
      return { success: true, url: data.trim() };
    } else {
      // Jika gagal dan masih ada retry
      if (retry < 2) {
        await new Promise((r) => setTimeout(r, 3000));
        return uploadCatbox(filePath, retry + 1);
      }
      return { success: false, error: data || "Upload failed" };
    }
  } catch (error) {
    if (retry < 2) {
      await new Promise((r) => setTimeout(r, 3000));
      return uploadCatbox(filePath, retry + 1);
    }
    return { success: false, error: error.message };
  }
}

module.exports = { uploadCatbox };
