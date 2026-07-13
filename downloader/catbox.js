const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function uploadCatbox(filePath) {
  try {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
      timeout: 120000,
    });

    if (data && data.startsWith("https://files.catbox.moe/")) {
      return { success: true, url: data.trim() };
    } else {
      return { success: false, error: data || "Upload failed" };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { uploadCatbox };
