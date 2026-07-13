const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { downloadYoutube } = require("../downloader/youtube");
const { downloadTiktok } = require("../downloader/tiktok");
const { downloadSpotify } = require("../downloader/spotify");
const { downloadInstagram } = require("../downloader/instagram");
const { uploadCatbox } = require("../downloader/catbox");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const TEMP_DIR = "/tmp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage, limits: { files: 10 } }); // Maksimal 10 file

// ========== ENDPOINTS ==========
app.post("/api/download/youtube", async (req, res) => {
  const { url, format } = req.body;
  if (!url || !format)
    return res
      .status(400)
      .json({ success: false, message: "URL dan format wajib diisi" });
  try {
    const result = await downloadYoutube(url, format, TEMP_DIR);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    const filePath = result.data.filePath;
    if (fs.existsSync(filePath)) {
      return res.download(filePath, result.data.filename, (err) => {
        if (err) console.error(err);
        fs.unlink(filePath, () => {});
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "File tidak ditemukan" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/download/tiktok", async (req, res) => {
  const { url } = req.body;
  if (!url)
    return res
      .status(400)
      .json({ success: false, message: "URL TikTok wajib diisi" });
  try {
    const result = await downloadTiktok(url, { hd: true });
    if (!result.status)
      return res.status(500).json({ success: false, message: result.error });
    res.json({ success: true, data: result.result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/download/spotify", async (req, res) => {
  const { url } = req.body;
  if (!url)
    return res
      .status(400)
      .json({ success: false, message: "URL Spotify wajib diisi" });
  try {
    const result = await downloadSpotify(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/download/instagram", async (req, res) => {
  const { url } = req.body;
  if (!url)
    return res
      .status(400)
      .json({ success: false, message: "URL Instagram wajib diisi" });
  try {
    const result = await downloadInstagram(url);
    if (!result.success)
      return res
        .status(500)
        .json({ success: false, message: result.error || "Gagal" });
    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== MULTI-FILE UPLOAD =====
app.post("/api/upload/catbox", upload.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Tidak ada file yang diupload" });
  }

  const results = [];
  for (const file of req.files) {
    const result = await uploadCatbox(file.path);
    // Hapus file temp
    fs.unlink(file.path, () => {});
    results.push({
      filename: file.originalname,
      success: result.success,
      url: result.url || null,
      error: result.error || null,
    });
  }

  const allSuccess = results.every((r) => r.success);
  res.json({
    success: allSuccess,
    results: results,
    message: allSuccess
      ? "Semua file berhasil diupload"
      : "Beberapa file gagal diupload",
  });
});

// ===== Development only =====
if (process.env.NODE_ENV !== "production") {
  app.use(express.static(path.join(__dirname, "../public")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });
}

module.exports = app;
