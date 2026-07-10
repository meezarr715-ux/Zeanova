(function () {
  "use strict";

  // ===== TAB SWITCHING =====
  const navLinks = document.querySelectorAll(".nav-link");
  const panes = {
    home: document.getElementById("tab-home"),
    download: document.getElementById("tab-download"),
    upload: document.getElementById("tab-upload"),
    ai: document.getElementById("tab-ai"),
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      const target = link.dataset.tab;
      Object.keys(panes).forEach((key) => {
        panes[key].classList.toggle("active", key === target);
      });
      document.getElementById("dlResult").classList.remove("show");
    });
  });

  // ===== TOAST =====
  function showToast(msg, isError = false) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "toast" + (isError ? " error" : "");
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // ===== DOWNLOAD - Platform Buttons (tanpa Pinterest) =====
  const platformBtns = document.querySelectorAll(".platform-btn");
  const platformLabel = document.getElementById("platformLabel");
  const dlUrl = document.getElementById("dlUrl");
  const dlBtn = document.getElementById("dlBtn");
  const dlLoader = document.getElementById("dlLoader");
  const dlResult = document.getElementById("dlResult");
  const dlMeta = document.getElementById("dlMeta");
  const dlActions = document.getElementById("dlActions");

  const platformConfig = {
    youtube: {
      label: "Masukkan URL YouTube",
      placeholder: "https://www.youtube.com/watch?v=...",
    },
    tiktok: {
      label: "Masukkan URL TikTok",
      placeholder: "https://vt.tiktok.com/... atau https://www.tiktok.com/...",
    },
    spotify: {
      label: "Masukkan URL Spotify (Single Track)",
      placeholder: "https://open.spotify.com/track/...",
    },
    instagram: {
      label: "Masukkan URL Instagram",
      placeholder: "https://www.instagram.com/reel/...",
    },
  };

  let currentPlatform = "youtube";

  platformBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      platformBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentPlatform = btn.dataset.platform;
      const config = platformConfig[currentPlatform];
      platformLabel.textContent = config.label;
      dlUrl.placeholder = config.placeholder;
      dlUrl.value = "";
      dlResult.classList.remove("show");
    });
  });

  // ===== HELPERS =====
  function sanitize(str) {
    if (!str) return "—";
    return str.replace(/[<>]/g, "").substring(0, 120);
  }
  function formatNumber(n) {
    if (n == null) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toString();
  }

  // ===== DOWNLOAD ACTION =====
  dlBtn.addEventListener("click", async () => {
    const url = dlUrl.value.trim();
    if (!url) {
      showToast("Masukkan URL terlebih dahulu", true);
      return;
    }

    dlBtn.disabled = true;
    dlLoader.classList.add("show");
    dlResult.classList.remove("show");

    try {
      let endpoint = "",
        body = { url };
      const platform = currentPlatform;

      if (platform === "youtube") {
        endpoint = "/api/download/youtube";
        body.format = "mp3";
      } else if (platform === "tiktok") endpoint = "/api/download/tiktok";
      else if (platform === "spotify") endpoint = "/api/download/spotify";
      else if (platform === "instagram") endpoint = "/api/download/instagram";

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.message || data.error || "Gagal memproses");
      }

      // Render hasil
      if (platform === "youtube") {
        const d = data.data;
        dlMeta.innerHTML = `
                    <div><span class="label">Judul</span> ${sanitize(d.title)}</div>
                    <div><span class="label">Ukuran</span> ${d.size || "—"}</div>
                `;
        dlActions.innerHTML = `
                    <a href="${d.downloadUrl}" class="btn btn-success" download="${d.filename || "download"}"><i class="fas fa-download"></i> Unduh</a>
                    <button class="btn btn-outline" onclick="this.closest('.result').classList.remove('show')">Tutup</button>
                `;
      } else if (platform === "tiktok") {
        const r = data.data;
        const meta = r.metadata || {};
        const author = r.author || {};
        const stats = r.stats || {};
        const isSlide = meta.type === "image_slide";
        let html = `
                    <div><span class="label">Deskripsi</span> ${sanitize(meta.description)}</div>
                    <div><span class="label">Author</span> ${sanitize(author.nickname || author.uniqueId)}</div>
                    <div><span class="label">Like</span> ${formatNumber(stats.likes)}</div>
                `;
        dlMeta.innerHTML = html;
        let actionsHtml = "";
        if (!isSlide) {
          const urls = r.originalUrl || {};
          if (urls.hd_nonwatermark)
            actionsHtml += `<a href="${urls.hd_nonwatermark}" class="btn btn-success" target="_blank">HD (no WM)</a>`;
          if (urls.watermark)
            actionsHtml += `<a href="${urls.watermark}" class="btn btn-outline" target="_blank">WM</a>`;
          if (r.cloudUrl && r.cloudUrl.hd_nonwatermark)
            actionsHtml += `<a href="${r.cloudUrl.hd_nonwatermark}" class="btn btn-success" target="_blank">Cloud HD</a>`;
        } else {
          const images = r.originalUrl?.images || [];
          images.forEach((img, i) => {
            actionsHtml += `<a href="${img}" class="btn btn-outline" target="_blank">Gambar ${i + 1}</a>`;
          });
          if (r.originalUrl?.audio)
            actionsHtml += `<a href="${r.originalUrl.audio}" class="btn btn-success" target="_blank">Audio</a>`;
        }
        if (r.music && r.music.playUrl && !isSlide) {
          actionsHtml += `<a href="${r.music.playUrl}" class="btn btn-success" target="_blank">Musik</a>`;
        }
        actionsHtml += `<button class="btn btn-outline" onclick="this.closest('.result').classList.remove('show')">Tutup</button>`;
        dlActions.innerHTML = actionsHtml || "Tidak ada link";
      } else if (platform === "spotify") {
        if (data.success) {
          const d = data;
          let metaHtml = "";
          if (d.metadata) {
            metaHtml = `
                            <div><span class="label">Judul</span> ${sanitize(d.metadata.title)}</div>
                            <div><span class="label">Artis</span> ${sanitize(d.metadata.artist)}</div>
                            <div><span class="label">Album</span> ${sanitize(d.metadata.album)}</div>
                        `;
          }
          dlMeta.innerHTML = metaHtml || "Metadata tidak tersedia";
          dlActions.innerHTML = `
                        <a href="${d.download_url}" class="btn btn-success" target="_blank"><i class="fas fa-download"></i> Download</a>
                        <button class="btn btn-outline" onclick="this.closest('.result').classList.remove('show')">Tutup</button>
                    `;
        } else {
          throw new Error(data.error || "Gagal");
        }
      } else if (platform === "instagram") {
        if (data.success) {
          const links = data.downloadLinks || [];
          let html = "";
          links.forEach((link, i) => {
            html += `<a href="${link.url}" class="btn btn-success" target="_blank">${link.type || "Download"}</a>`;
          });
          html += `<button class="btn btn-outline" onclick="this.closest('.result').classList.remove('show')">Tutup</button>`;
          dlActions.innerHTML = html;
          dlMeta.innerHTML = `<div>${links.length} link ditemukan</div>`;
        } else {
          throw new Error(data.error || "Gagal");
        }
      }

      dlResult.classList.add("show");
      showToast("✅ Siap diunduh!");
    } catch (err) {
      showToast("❌ " + err.message, true);
      dlResult.classList.remove("show");
    } finally {
      dlBtn.disabled = false;
      dlLoader.classList.remove("show");
    }
  });

  dlUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dlBtn.click();
  });

  // ===== UPLOAD (Auto Upload + History) =====
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const uploadLoader = document.getElementById("uploadLoader");
  const historyList = document.getElementById("historyList");

  // Key untuk localStorage
  const STORAGE_KEY = "zeanova_upload_history";

  // Fungsi untuk mendapatkan history dari localStorage
  function getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Simpan history ke localStorage
  function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  // Tambah entri baru (maksimal 5, jika lebih hapus yang paling bawah)
  function addHistoryEntry(name, url) {
    let history = getHistory();
    const newEntry = { name, url, timestamp: Date.now() };
    history.unshift(newEntry); // tambah di awal (terbaru)
    if (history.length > 5) {
      history = history.slice(0, 5); // ambil 5 pertama
    }
    saveHistory(history);
    renderHistory();
  }

  // Render daftar history
  function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = "";
    if (history.length === 0) {
      historyList.innerHTML =
        '<li style="color:#7a9ab8;text-align:center;padding:1rem;">Belum ada upload</li>';
      return;
    }
    history.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
                <span class="file-name">${sanitize(item.name)}</span>
                <a href="${item.url}" class="file-link" target="_blank">${item.url}</a>
            `;
      historyList.appendChild(li);
    });
  }

  // Upload file
  async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    uploadLoader.classList.add("show");

    try {
      const resp = await fetch("/api/upload/catbox", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.message || "Gagal upload");
      }

      // Tambahkan ke history
      addHistoryEntry(file.name, data.url);
      showToast("✅ Upload berhasil!");

      // Reset drop zone
      dropZone.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Drag &amp; drop gambar di sini, atau klik untuk pilih file</p>
                <input type="file" id="fileInput" accept="image/*" style="display:none;" />
            `;
      // Re-attach event listener untuk file input
      const newFileInput = dropZone.querySelector("#fileInput");
      newFileInput.addEventListener("change", handleFileSelect);
    } catch (err) {
      showToast("❌ " + err.message, true);
    } finally {
      uploadLoader.classList.remove("show");
    }
  }

  // Handler saat file dipilih
  function handleFileSelect(e) {
    if (e.target.files.length) {
      const file = e.target.files[0];
      dropZone.innerHTML = `
                <i class="fas fa-file-image"></i>
                <p>${file.name}</p>
                <small style="color:#5a7a94;">Mengupload otomatis...</small>
            `;
      uploadFile(file);
    }
  }

  // Event listeners untuk drop zone
  dropZone.addEventListener("click", () => {
    const input = document.getElementById("fileInput");
    if (input) input.click();
  });

  // Ganti event listener untuk file input
  const fileInputEl = document.getElementById("fileInput");
  fileInputEl.addEventListener("change", handleFileSelect);

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      const file = e.dataTransfer.files[0];
      dropZone.innerHTML = `
                <i class="fas fa-file-image"></i>
                <p>${file.name}</p>
                <small style="color:#5a7a94;">Mengupload otomatis...</small>
            `;
      uploadFile(file);
    }
  });

  // Render history saat load
  renderHistory();

  console.log("🚀 Zeanova Library siap!");
})();
