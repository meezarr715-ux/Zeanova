const axios = require("axios");
const FormData = require("form-data");
const { createReadStream, existsSync } = require("fs");

const UPLOAD_URL = "https://www.cloudsky.biz.id/api/public/upload";
const BASE_FILE_URL = "https://www.cloudsky.biz.id/api/file";

const uploadedFiles = [];

async function uploadFile(fileInput, fileName = null) {
  try {
    const form = new FormData();

    if (Buffer.isBuffer(fileInput)) {
      if (!fileName)
        throw new Error("fileName wajib disertakan jika menggunakan Buffer");
      form.append("file", fileInput, { filename: fileName });
    } else if (typeof fileInput === "string") {
      if (!existsSync(fileInput))
        throw new Error(`File tidak ditemukan di path: ${fileInput}`);
      form.append("file", createReadStream(fileInput));
    } else {
      throw new Error(
        "Input tidak valid: harus berupa path file (string) atau Buffer",
      );
    }

    const response = await axios.post(UPLOAD_URL, form, {
      headers: { ...form.getHeaders() },
    });

    if (response.data && response.data.success) {
      const fileKey = response.data.data.key;
      const url = `${BASE_FILE_URL}/${fileKey}`;

      uploadedFiles.push({
        key: fileKey,
        url: url,
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: "Upload berhasil",
        data: { ...response.data.data, url },
      };
    }
    throw new Error(response.data.message || "Upload gagal dari server");
  } catch (error) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Terjadi kesalahan saat upload",
    };
  }
}

async function deleteFile(fileKey) {
  try {
    const response = await axios.delete(`${BASE_FILE_URL}/${fileKey}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (response.data && response.data.success) {
      const index = uploadedFiles.findIndex((f) => f.key === fileKey);
      if (index !== -1) uploadedFiles.splice(index, 1);
      return { success: true, message: "File berhasil dihapus" };
    }
    throw new Error(response.data.message || "Gagal menghapus file");
  } catch (error) {
    console.error("Delete file error:", error.message);
    return { success: false, message: error.message };
  }
}

function cleanExpiredFiles(days = 7) {
  const now = Date.now();
  const expireTime = days * 24 * 60 * 60 * 1000;
  const expired = uploadedFiles.filter((f) => now - f.timestamp > expireTime);
  if (expired.length > 0) {
    console.log(
      `🗑️ Menghapus ${expired.length} file dari daftar lokal (sudah lewat ${days} hari)`,
    );
    expired.forEach((f) => {
      const index = uploadedFiles.findIndex((item) => item.key === f.key);
      if (index !== -1) uploadedFiles.splice(index, 1);
    });
  }
}

if (
  process.env.NODE_ENV !== "production" ||
  process.env.CLEANUP_ENABLED === "true"
) {
  setInterval(() => cleanExpiredFiles(7), 6 * 60 * 60 * 1000);
}

module.exports = { uploadFile, deleteFile, cleanExpiredFiles, uploadedFiles };
