const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function uploadCatbox(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { status: false, error: "File not found" };
    }

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: {
        ...form.getHeaders(),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
      },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (data && data.startsWith("https://files.catbox.moe/")) {
      return { status: true, url: data.trim() };
    } else {
      return { status: false, error: data || "Upload failed" };
    }
  } catch (err) {
    return { status: false, error: err.message };
  }
}

module.exports = { uploadCatbox };
