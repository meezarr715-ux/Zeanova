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

  // Fungsi untuk membersihkan semua result box di downloader
  function clearAllDownloadResults() {
    document.querySelectorAll(".result-box").forEach((box) => {
      box.classList.remove("show");
      box.innerHTML = "";
    });
    // Kosongkan juga input? Tidak, biarkan URL tetap tapi hasil dihapus.
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
      // Saat pindah nav, bersihkan semua result di downloader
      clearAllDownloadResults();
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
      // Bersihkan result saat pindah platform
      clearAllDownloadResults();
    });
  });

  // ========== DOWNLOAD FUNCTIONS ==========
  function showResult(container, html, isError = false) {
    container.innerHTML = html;
    container.classList.add("show");
  }

  function showLoading(container) {
    container.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i> Memproses...</div>`;
    container.classList.add("show");
  }

  function hideResult(container) {
    container.classList.remove("show");
    container.innerHTML = "";
  }

  // ----- YouTube -----
  const ytUrl = document.getElementById("ytUrl");
  const ytResult = document.getElementById("ytResult");
  const ytFormatRadios = document.querySelectorAll('input[name="ytFormat"]');

  function getYtFormat() {
    for (const r of ytFormatRadios) {
      if (r.checked) return r.value;
    }
    return "mp3";
  }

  document
    .querySelector('.btn-download[data-platform="youtube"]')
    .addEventListener("click", async () => {
      const url = ytUrl.value.trim();
      if (!url) return alert("Masukkan URL YouTube.");
      const format = getYtFormat();
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
        <div class="action-buttons">
          <a href="${d.downloadUrl}" class="btn-download" download="${d.filename}"><i class="fas fa-download"></i> Unduh ${format.toUpperCase()}</a>
        </div>
      `,
        );
      } catch (err) {
        showResult(
          ytResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
          true,
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
        html += `<div class="action-buttons">`;

        if (isSlide) {
          // Slide foto: satu tombol untuk download semua foto
          const images = r.originalUrl?.images || [];
          if (images.length > 0) {
            // Buka semua gambar di tab baru secara bersamaan
            const imgLinks = images
              .map(
                (img) =>
                  `<a href="${img}" target="_blank" class="btn-download"><i class="fas fa-images"></i> Download Semua Foto (${images.length})</a>`,
              )
              .join("");
            html += imgLinks;
          }
          if (r.originalUrl?.audio) {
            html += `<a href="${r.originalUrl.audio}" class="btn-download" target="_blank"><i class="fas fa-music"></i> Audio</a>`;
          }
        } else {
          // Video: 3 tombol
          const urls = r.originalUrl || {};
          if (urls.hd_nonwatermark) {
            html += `<a href="${urls.hd_nonwatermark}" class="btn-download" target="_blank"><i class="fas fa-video"></i> Download HD</a>`;
          }
          if (urls.watermark) {
            html += `<a href="${urls.watermark}" class="btn-download" style="background:rgba(255,255,255,0.1); color:var(--text-primary);" target="_blank"><i class="fas fa-water"></i> Dengan WM</a>`;
          }
          if (r.music && r.music.playUrl) {
            html += `<a href="${r.music.playUrl}" class="btn-download" target="_blank"><i class="fas fa-music"></i> Audio</a>`;
          }
        }
        html += `</div>`;
        showResult(ttResult, html);
      } catch (err) {
        showResult(
          ttResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
          true,
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
        html += `<div class="action-buttons"><a href="${data.download_url}" class="btn-download" target="_blank"><i class="fas fa-download"></i> Download</a></div>`;
        showResult(spResult, html);
      } catch (err) {
        showResult(
          spResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
          true,
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
        const links = data.downloadLinks || [];
        if (links.length === 0) throw new Error("Tidak ada link ditemukan");

        // Pisahkan foto dan video berdasarkan tipe atau URL
        const photoLinks = links.filter(
          (l) => l.type && l.type.toLowerCase().includes("photo"),
        );
        const videoLinks = links.filter(
          (l) => l.type && l.type.toLowerCase().includes("video"),
        );
        // Jika tidak ada tipe, asumsikan semua foto
        const finalPhotoLinks = photoLinks.length > 0 ? photoLinks : links;
        const finalVideoLinks = videoLinks;

        let html = `<div class="success"><i class="fas fa-check-circle"></i> ${links.length} link ditemukan</div>`;
        html += `<div class="action-buttons">`;

        // Tombol download semua foto (satu)
        if (finalPhotoLinks.length > 0) {
          const photoUrls = finalPhotoLinks.map((l) => l.url);
          html += `<a href="${photoUrls[0]}" class="btn-download" target="_blank"><i class="fas fa-images"></i> Download Foto (${finalPhotoLinks.length})</a>`;
          // Untuk multiple foto, kita buka semua di tab baru (tapi hanya satu yang bisa di-download sekaligus? lebih baik beri link ke semua)
          // Alternatif: buka semua di tab baru
          if (finalPhotoLinks.length > 1) {
            // Tambahkan tombol untuk membuka semua foto
            const allPhotoUrls = finalPhotoLinks.map((l) => l.url).join(",");
            html += `<button class="btn-download" onclick="window.open('${finalPhotoLinks.map((l) => l.url).join("','")}');"><i class="fas fa-images"></i> Buka Semua Foto (${finalPhotoLinks.length})</button>`;
          }
        }

        // Tombol download video (jika ada)
        if (finalVideoLinks.length > 0) {
          const videoUrls = finalVideoLinks.map((l) => l.url);
          html += `<a href="${videoUrls[0]}" class="btn-download" target="_blank"><i class="fas fa-video"></i> Download Video</a>`;
        }

        html += `</div>`;
        showResult(igResult, html);
      } catch (err) {
        showResult(
          igResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
          true,
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
          data.links.forEach((item) =>
            addLinkToHistory(item.filename, item.url, false),
          );
          return;
        }
      } catch (e) {}
    }
    sessionStorage.removeItem("zeanova_links");
    linkHistory.innerHTML = `<div class="empty-msg">Belum ada link yang dihasilkan.</div>`;
  }

  function saveHistory() {
    const items = linkHistory.querySelectorAll(".link-item");
    const links = [];
    items.forEach((item) => {
      const filename = item.querySelector(".filename")?.textContent || "";
      const url = item.querySelector(".link-url")?.getAttribute("href") || "";
      if (url) links.push({ filename, url });
    });
    const data = { timestamp: Date.now(), links: links.slice(0, 10) };
    sessionStorage.setItem("zeanova_links", JSON.stringify(data));
  }

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
            addLinkToHistory(file.name, data.url);
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
  loadHistory();
  // Saat load halaman, bersihkan semua result
  clearAllDownloadResults();

  console.log("🚀 Zeanova Library siap!");
})();
