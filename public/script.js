(function () {
  "use strict";

  // ========== NAVIGATION ==========
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = {
    home: document.getElementById("page-home"),
    downloader: document.getElementById("page-downloader"),
    convert: document.getElementById("page-convert"),
    bug: document.getElementById("page-bug"),
  };
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  // Fungsi untuk clear semua hasil download & convert saat pindah nav
  function clearAllResults() {
    // Hapus semua result boxes
    document.querySelectorAll(".result-box").forEach((box) => {
      box.classList.remove("show");
      box.innerHTML = "";
    });
    // Hapus riwayat convert (link history)
    const linkHistory = document.getElementById("linkHistory");
    if (linkHistory) {
      linkHistory.innerHTML =
        '<div class="empty-msg">Belum ada link yang dihasilkan.</div>';
    }
    // Hapus sessionStorage agar tidak ada jejak
    sessionStorage.removeItem("zeanova_links");
    // Reset progress bar
    const progressFill = document.getElementById("uploadProgress");
    if (progressFill) progressFill.style.width = "0%";
    // Reset upload area
    const uploadArea = document.getElementById("uploadArea");
    if (uploadArea) {
      uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drag & drop gambar di sini</h3>
        <p>atau klik untuk memilih file (JPG, PNG, GIF, dll.)</p>
        <input type="file" id="fileInput" accept="image/*" style="display:none;" />
      `;
      attachUploadEvents(); // re-attach
    }
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const page = item.dataset.page;
      Object.keys(tabContents).forEach((key) => {
        tabContents[key].classList.toggle("active", key === page);
      });
      navMenu.classList.remove("open");
      // Hapus semua jejak link saat pindah nav
      clearAllResults();
    });
  });

  navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("open");
  });

  // ========== DOWNLOADER TABS ==========
  const dlTabs = document.querySelectorAll(".dl-tab");
  const dlPanels = document.querySelectorAll(".dl-panel");

  dlTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      dlTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const platform = tab.dataset.platform;
      dlPanels.forEach((p) => {
        p.classList.toggle("active", p.dataset.platform === platform);
      });
      // Saat ganti tab download, clear hasil sebelumnya
      document.querySelectorAll(".result-box").forEach((box) => {
        box.classList.remove("show");
        box.innerHTML = "";
      });
    });
  });

  // ========== DOWNLOAD FUNCTIONS ==========
  function showResult(container, html) {
    container.innerHTML = html;
    container.classList.add("show");
  }

  function showLoading(container) {
    container.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i> Memproses...</div>`;
    container.classList.add("show");
  }

  // ----- YouTube -----
  const ytUrl = document.getElementById("ytUrl");
  const ytResult = document.getElementById("ytResult");
  document
    .querySelector('.btn-download[data-platform="youtube"]')
    .addEventListener("click", async () => {
      const url = ytUrl.value.trim();
      if (!url) return alert("Masukkan URL YouTube.");
      const format =
        document.querySelector('input[name="ytFormat"]:checked')?.value ||
        "mp3";
      showLoading(ytResult);
      try {
        const resp = await fetch("/api/download/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, format }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.message || "Gagal");
        const d = data.data;
        showResult(
          ytResult,
          `
        <div class="success"><i class="fas fa-check-circle"></i> Siap diunduh</div>
        <div style="margin-top:8px;"><strong>Judul:</strong> ${escapeHtml(d.title)}</div>
        <div><strong>Ukuran:</strong> ${d.size || "—"}</div>
        <div style="margin-top:12px;">
          <a href="${d.downloadUrl}" class="btn-download" style="display:inline-flex;" download="${d.filename}"><i class="fas fa-download"></i> Unduh ${format.toUpperCase()}</a>
        </div>
      `,
        );
      } catch (err) {
        showResult(
          ytResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ----- TikTok (3 button: HD, WM, Audio) -----
  const ttUrl = document.getElementById("ttUrl");
  const ttResult = document.getElementById("ttResult");
  document
    .querySelector('.btn-download[data-platform="tiktok"]')
    .addEventListener("click", async () => {
      const url = ttUrl.value.trim();
      if (!url) return alert("Masukkan URL TikTok.");
      showLoading(ttResult);
      try {
        const resp = await fetch("/api/download/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.message || "Gagal");
        const r = data.data;
        const meta = r.metadata || {};
        const author = r.author || {};
        const stats = r.stats || {};

        let html = `<div class="success"><i class="fas fa-check-circle"></i> Berhasil</div>`;
        html += `<div><strong>Deskripsi:</strong> ${escapeHtml(meta.description || "—")}</div>`;
        html += `<div><strong>Author:</strong> ${escapeHtml(author.nickname || author.uniqueId || "—")}</div>`;
        html += `<div><strong>Like:</strong> ${formatNumber(stats.likes)}</div>`;

        if (r.type === "slide") {
          // FOTO: hanya 1 button untuk download semua foto sekaligus
          const images = r.originalUrl?.images || [];
          if (images.length > 0) {
            // Buat ZIP atau download satu per satu? Kita berikan link ke gambar pertama dengan opsi download all
            // Karena tidak ada API zip, kita berikan link gambar pertama dan info
            html += `<div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">`;
            images.forEach((img, i) => {
              html += `<a href="${img}" class="btn-download" style="display:inline-flex; background:rgba(255,255,255,0.08); color:var(--text-primary);" target="_blank" download><i class="fas fa-image"></i> Gambar ${i + 1}</a>`;
            });
            if (r.originalUrl?.audio) {
              html += `<a href="${r.originalUrl.audio}" class="btn-download" style="display:inline-flex;" target="_blank"><i class="fas fa-music"></i> Audio</a>`;
            }
            html += `</div>`;
          } else {
            html += `<div class="error">Tidak ada gambar ditemukan.</div>`;
          }
        } else {
          // VIDEO: 3 button (HD, WM, Audio)
          const urls = r.originalUrl || {};
          const cloudUrls = r.cloudUrl || {};
          html += `<div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">`;
          // HD (prioritaskan cloud jika ada)
          const hdUrl = cloudUrls.hd_nonwatermark || urls.hd_nonwatermark;
          if (hdUrl) {
            html += `<a href="${hdUrl}" class="btn-download" style="display:inline-flex;" target="_blank"><i class="fas fa-video"></i> Download HD</a>`;
          }
          // WM
          const wmUrl = cloudUrls.watermark || urls.watermark;
          if (wmUrl) {
            html += `<a href="${wmUrl}" class="btn-download" style="display:inline-flex; background:rgba(255,255,255,0.08); color:var(--text-primary);" target="_blank"><i class="fas fa-water"></i> Download WM</a>`;
          }
          // Audio
          if (r.music && r.music.playUrl) {
            html += `<a href="${r.music.playUrl}" class="btn-download" style="display:inline-flex;" target="_blank"><i class="fas fa-music"></i> Download Audio</a>`;
          }
          html += `</div>`;
        }
        showResult(ttResult, html);
      } catch (err) {
        showResult(
          ttResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ----- Spotify (perbaikan) -----
  const spUrl = document.getElementById("spUrl");
  const spResult = document.getElementById("spResult");
  document
    .querySelector('.btn-download[data-platform="spotify"]')
    .addEventListener("click", async () => {
      const url = spUrl.value.trim();
      if (!url) return alert("Masukkan URL Spotify (single track).");
      showLoading(spResult);
      try {
        const resp = await fetch("/api/download/spotify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || "Gagal");
        let html = `<div class="success"><i class="fas fa-check-circle"></i> Siap diunduh</div>`;
        if (data.metadata) {
          html += `<div><strong>Judul:</strong> ${escapeHtml(data.metadata.title)}</div>`;
          html += `<div><strong>Artis:</strong> ${escapeHtml(data.metadata.artist)}</div>`;
          html += `<div><strong>Album:</strong> ${escapeHtml(data.metadata.album)}</div>`;
        }
        html += `<div style="margin-top:12px;"><a href="${data.download_url}" class="btn-download" style="display:inline-flex;" target="_blank"><i class="fas fa-download"></i> Download</a></div>`;
        showResult(spResult, html);
      } catch (err) {
        showResult(
          spResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ----- Instagram (2 button: Download Foto & Download Video) -----
  const igUrl = document.getElementById("igUrl");
  const igResult = document.getElementById("igResult");
  document
    .querySelector('.btn-download[data-platform="instagram"]')
    .addEventListener("click", async () => {
      const url = igUrl.value.trim();
      if (!url) return alert("Masukkan URL Instagram.");
      showLoading(igResult);
      try {
        const resp = await fetch("/api/download/instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || "Gagal");
        const links = data.downloadLinks || [];
        const photoCount = data.photoCount || 0;
        const videoCount = data.videoCount || 0;

        if (links.length === 0) throw new Error("Tidak ada link ditemukan");

        let html = `<div class="success"><i class="fas fa-check-circle"></i> ${links.length} link ditemukan</div>`;
        html += `<div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">`;

        // Button Download Foto (semua foto sekaligus)
        const photoLinks = links.filter((l) => l.type === "Photo");
        if (photoLinks.length > 0) {
          // Jika lebih dari 1 foto, kita berikan link ke semua foto
          photoLinks.forEach((link, idx) => {
            html += `<a href="${link.url}" class="btn-download" style="display:inline-flex; background:rgba(255,255,255,0.08); color:var(--text-primary);" target="_blank" download><i class="fas fa-image"></i> Foto ${idx + 1}</a>`;
          });
        }

        // Button Download Video (hanya jika ada video)
        const videoLinks = links.filter((l) => l.type === "Video");
        if (videoLinks.length > 0) {
          videoLinks.forEach((link, idx) => {
            html += `<a href="${link.url}" class="btn-download" style="display:inline-flex;" target="_blank" download><i class="fas fa-video"></i> Video ${idx + 1}</a>`;
          });
        }

        html += `</div>`;
        showResult(igResult, html);
      } catch (err) {
        showResult(
          igResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ========== CONVERT (OTOMATIS) ==========
  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");
  const uploadProgress = document.getElementById("uploadProgress");
  const linkHistory = document.getElementById("linkHistory");

  let selectedFile = null;
  let isUploading = false;

  // --- Load history from sessionStorage (max 30 detik) ---
  function loadHistory() {
    const stored = sessionStorage.getItem("zeanova_links");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.timestamp && Date.now() - data.timestamp < 30000) {
          // masih valid
          data.links.forEach((item) =>
            addLinkToHistory(item.filename, item.url, false),
          );
          return;
        }
      } catch (e) {}
    }
    // jika tidak valid atau kosong, hapus
    sessionStorage.removeItem("zeanova_links");
    linkHistory.innerHTML = `<div class="empty-msg">Belum ada link yang dihasilkan.</div>`;
  }

  // --- Simpan history ke sessionStorage ---
  function saveHistory() {
    const items = linkHistory.querySelectorAll(".link-item");
    const links = [];
    items.forEach((item) => {
      const filename = item.querySelector(".filename")?.textContent || "";
      const url = item.querySelector(".link-url")?.getAttribute("href") || "";
      if (url) links.push({ filename, url });
    });
    const data = {
      timestamp: Date.now(),
      links: links.slice(0, 10),
    };
    sessionStorage.setItem("zeanova_links", JSON.stringify(data));
  }

  // --- Tambah item ke riwayat ---
  function addLinkToHistory(filename, url, save = true) {
    const emptyMsg = linkHistory.querySelector(".empty-msg");
    if (emptyMsg) emptyMsg.remove();

    while (linkHistory.children.length >= 10) {
      linkHistory.removeChild(linkHistory.lastChild);
    }

    const item = document.createElement("div");
    item.className = "link-item";
    item.innerHTML = `
      <div class="link-info">
        <i class="fas fa-link"></i>
        <span class="filename">${escapeHtml(filename)}</span>
      </div>
      <a href="${url}" class="link-url" target="_blank">${url}</a>
      <button class="copy-btn" onclick="navigator.clipboard.writeText('${url}')"><i class="fas fa-copy"></i> Salin</button>
    `;
    linkHistory.prepend(item);
    if (save) saveHistory();
  }

  // --- Upload otomatis ---
  async function autoUpload(file) {
    if (isUploading) return;
    isUploading = true;
    uploadProgress.style.width = "0%";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload/catbox");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = (e.loaded / e.total) * 100;
          uploadProgress.style.width = pct + "%";
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            const url = data.url;
            addLinkToHistory(file.name, url);
            resetUploadArea();
            uploadProgress.style.width = "0%";
          } else {
            alert("Upload gagal: " + (data.message || "Unknown error"));
          }
        } else {
          alert("Server error: " + xhr.status);
        }
        isUploading = false;
      };
      xhr.onerror = () => {
        alert("Gagal terhubung ke server.");
        isUploading = false;
      };
      xhr.send(formData);
    } catch (err) {
      alert("Error: " + err.message);
      isUploading = false;
    }
  }

  function resetUploadArea() {
    selectedFile = null;
    fileInput.value = "";
    uploadArea.innerHTML = `
      <i class="fas fa-cloud-upload-alt"></i>
      <h3>Drag & drop gambar di sini</h3>
      <p>atau klik untuk memilih file (JPG, PNG, GIF, dll.)</p>
      <input type="file" id="fileInput" accept="image/*" style="display:none;" />
    `;
    attachUploadEvents();
  }

  function attachUploadEvents() {
    const newFileInput = document.getElementById("fileInput");
    if (newFileInput) {
      newFileInput.addEventListener("change", (e) => {
        if (e.target.files.length) {
          const file = e.target.files[0];
          selectedFile = file;
          uploadArea.innerHTML = `<i class="fas fa-check-circle" style="color:#51cf66;"></i><h3>${escapeHtml(file.name)}</h3><p>${(file.size / 1024).toFixed(0)} KB</p>`;
          autoUpload(file);
        }
      });
    }

    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        selectedFile = file;
        uploadArea.innerHTML = `<i class="fas fa-check-circle" style="color:#51cf66;"></i><h3>${escapeHtml(file.name)}</h3><p>${(file.size / 1024).toFixed(0)} KB</p>`;
        autoUpload(file);
      }
    });

    uploadArea.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      const inp = document.getElementById("fileInput");
      if (inp) inp.click();
    });
  }

  attachUploadEvents();

  // ========== HELPERS ==========
  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatNumber(n) {
    if (n == null) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toString();
  }

  // Enter key untuk semua input di downloader
  document.querySelectorAll(".input-group input").forEach((inp) => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const btn = inp.closest(".input-group").querySelector(".btn-download");
        if (btn) btn.click();
      }
    });
  });

  // ========== INIT ==========
  // Tidak load history apapun agar kosong saat refresh
  linkHistory.innerHTML = `<div class="empty-msg">Belum ada link yang dihasilkan.</div>`;
  sessionStorage.removeItem("zeanova_links");

  console.log("🚀 Zeanova Library siap!");
})();
