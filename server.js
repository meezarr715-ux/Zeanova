const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { downloadYoutube } = require("./downloader/youtube");
const { downloadTiktok } = require("./downloader/tiktok");
const { downloadSpotify } = require("./downloader/spotify");
const { downloadInstagram } = require("./downloader/instagram");
const { uploadCatbox } = require("./downloader/catbox");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const TEMP_DIR = path.join(__dirname, "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

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
    res.json({ success: true, data: result.data });
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
    const result = await downloadTiktok(url);
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
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/upload/catbox", upload.single("file"), async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "File tidak ditemukan" });
  try {
    const result = await uploadCatbox(req.file.path);
    fs.unlink(req.file.path, () => {});
    if (result.success) {
      res.json({ success: true, url: result.url });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/zean/:filename", (req, res) => {
  const filePath = path.join(TEMP_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) console.error("Download error:", err);
    });
  } else {
    res.status(404).send("File tidak ditemukan");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Zeanova Library berjalan di http://localhost:${PORT}`);
});
