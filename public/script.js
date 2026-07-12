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

  // Fungsi untuk reset semua hasil download dan convert
  function resetAllResults() {
    // Hapus semua result boxes
    document.querySelectorAll(".result-box").forEach((el) => {
      el.classList.remove("show");
      el.innerHTML = "";
    });
    // Reset convert: kosongkan link history (kecuali sessionStorage akan di-handle)
    // Tapi kita akan hapus sessionStorage juga
    sessionStorage.removeItem("zeanova_links");
    const linkHistory = document.getElementById("linkHistory");
    if (linkHistory) {
      linkHistory.innerHTML = `<div class="empty-msg">Belum ada link yang dihasilkan.</div>`;
    }
    // Reset upload area
    const uploadArea = document.getElementById("uploadArea");
    if (uploadArea) {
      uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drag & drop gambar di sini</h3>
        <p>atau klik untuk memilih file (JPG, PNG, GIF, dll.)</p>
        <input type="file" id="fileInput" accept="image/*" style="display:none;" />
      `;
    }
    const uploadProgress = document.getElementById("uploadProgress");
    if (uploadProgress) uploadProgress.style.width = "0%";
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
      // Reset semua hasil saat pindah nav
      resetAllResults();
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
      // Reset hasil saat pindah tab downloader
      document.querySelectorAll(".result-box").forEach((el) => {
        el.classList.remove("show");
        el.innerHTML = "";
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

  // ----- Format buttons YouTube -----
  let selectedFormat = "mp3";
  document.querySelectorAll(".format-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".format-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedFormat = btn.dataset.format;
    });
  });

  // ----- YouTube -----
  const ytUrl = document.getElementById("ytUrl");
  const ytResult = document.getElementById("ytResult");
  document
    .querySelector('.btn-download[data-platform="youtube"]')
    .addEventListener("click", async () => {
      const url = ytUrl.value.trim();
      if (!url) return alert("Masukkan URL YouTube.");
      const format = selectedFormat;
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

  // ----- TikTok -----
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
        const isSlide = meta.type === "image_slide";

        let html = `<div class="success"><i class="fas fa-check-circle"></i> Berhasil</div>`;
        html += `<div><strong>Deskripsi:</strong> ${escapeHtml(meta.description || "—")}</div>`;
        html += `<div><strong>Author:</strong> ${escapeHtml(author.nickname || author.uniqueId || "—")}</div>`;
        html += `<div><strong>Like:</strong> ${formatNumber(stats.likes)}</div>`;

        // Buat tombol sesuai tipe
        html += `<div class="btn-group">`;
        if (isSlide) {
          // Slide foto: tampilkan tombol download gambar dan audio
          const images = r.originalUrl?.images || [];
          if (images.length > 0) {
            // Gabungkan semua foto dalam satu zip? Tapi kita beri tombol per foto
            images.forEach((img, i) => {
              html += `<a href="${img}" class="btn-download" target="_blank"><i class="fas fa-image"></i> Foto ${i + 1}</a>`;
            });
          }
          if (r.originalUrl?.audio) {
            html += `<a href="${r.originalUrl.audio}" class="btn-download" target="_blank"><i class="fas fa-music"></i> Audio</a>`;
          }
        } else {
          // Video: 3 tombol (HD, WM, Audio)
          const urls = r.originalUrl || {};
          if (urls.hd_nonwatermark) {
            html += `<a href="${urls.hd_nonwatermark}" class="btn-download" target="_blank"><i class="fas fa-video"></i> Download HD</a>`;
          }
          if (urls.watermark) {
            html += `<a href="${urls.watermark}" class="btn-download" target="_blank"><i class="fas fa-water"></i> Download dengan WM</a>`;
          }
          if (r.music && r.music.playUrl) {
            html += `<a href="${r.music.playUrl}" class="btn-download" target="_blank"><i class="fas fa-music"></i> Download Audio</a>`;
          }
          // Jika ada cloudUrl, tambahkan juga
          if (r.cloudUrl && r.cloudUrl.hd_nonwatermark) {
            html += `<a href="${r.cloudUrl.hd_nonwatermark}" class="btn-download" target="_blank"><i class="fas fa-cloud"></i> Cloud HD</a>`;
          }
          if (r.cloudUrl && r.cloudUrl.watermark) {
            html += `<a href="${r.cloudUrl.watermark}" class="btn-download" target="_blank"><i class="fas fa-cloud"></i> Cloud WM</a>`;
          }
        }
        html += `</div>`;
        showResult(ttResult, html);
      } catch (err) {
        showResult(
          ttResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ----- Spotify -----
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
        html += `<div class="btn-group"><a href="${data.download_url}" class="btn-download" target="_blank"><i class="fas fa-download"></i> Download</a></div>`;
        showResult(spResult, html);
      } catch (err) {
        showResult(
          spResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ----- Instagram -----
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

        let html = `<div class="success"><i class="fas fa-check-circle"></i> Berhasil</div>`;
        html += `<div class="btn-group">`;

        // Foto (selalu ada)
        if (data.photos && data.photos.length > 0) {
          // Jika banyak foto, gabungkan dalam satu tombol download semua? Kita beri satu tombol untuk semua foto
          // Karena snapinsta memberikan link per foto, kita buat satu tombol yang mengarah ke link pertama atau kita bisa buat daftar
          // Tapi lebih baik beri satu tombol "Download Foto" yang mengunduh semua (kita beri link ke yang pertama, tapi user bisa pilih)
          // Kita buat satu tombol untuk semua foto (dengan multiple link)
          if (data.photos.length === 1) {
            html += `<a href="${data.photos[0]}" class="btn-download" target="_blank"><i class="fas fa-image"></i> Download Foto</a>`;
          } else {
            // Tampilkan tombol untuk setiap foto
            data.photos.forEach((photo, i) => {
              html += `<a href="${photo}" class="btn-download" target="_blank"><i class="fas fa-image"></i> Foto ${i + 1}</a>`;
            });
          }
        }

        // Video (jika ada)
        if (data.videos && data.videos.length > 0) {
          data.videos.forEach((video, i) => {
            html += `<a href="${video}" class="btn-download" target="_blank"><i class="fas fa-video"></i> Video ${i + 1}</a>`;
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
  // Load history
  loadHistory();

  // Reset semua saat pertama kali load (agar bersih)
  resetAllResults();

  console.log("🚀 Zeanova Library siap!");
})();
