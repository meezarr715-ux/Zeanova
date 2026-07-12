const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function uploadCatbox(filePath) {
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
      timeout: 300000,
    });
    if (data && data.startsWith("https://files.catbox.moe/")) {
      return { success: true, url: data.trim() };
    } else {
      return { success: false, error: data };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { uploadCatbox };
