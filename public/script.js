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

  // Fungsi reset semua state (link, result, sessionStorage)
  function resetAllState() {
    // Hapus sessionStorage
    sessionStorage.removeItem("zeanova_links");
    // Kosongkan riwayat convert
    const linkHistory = document.getElementById("linkHistory");
    if (linkHistory) {
      linkHistory.innerHTML = `<div class="empty-msg">Belum ada link yang dihasilkan.</div>`;
    }
    // Kosongkan semua result box
    document.querySelectorAll(".result-box").forEach((box) => {
      box.classList.remove("show");
      box.innerHTML = "";
    });
    // Kosongkan input URL
    document
      .querySelectorAll(".input-group input")
      .forEach((inp) => (inp.value = ""));
    // Reset progress
    const progress = document.getElementById("uploadProgress");
    if (progress) progress.style.width = "0%";
    // Reset upload area
    const uploadArea = document.getElementById("uploadArea");
    if (uploadArea) {
      uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drag & drop gambar di sini</h3>
        <p>atau klik untuk memilih file (JPG, PNG, GIF, dll.)</p>
        <input type="file" id="fileInput" accept="image/*" style="display:none;" />
      `;
      // Re-attach events (dilakukan di initConvert)
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
      // Reset semua state saat pindah nav
      resetAllState();
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
      // Reset result box saat pindah tab downloader
      document.querySelectorAll(".result-box").forEach((box) => {
        box.classList.remove("show");
        box.innerHTML = "";
      });
    });
  });

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

  function showResult(container, html) {
    container.innerHTML = html;
    container.classList.add("show");
  }

  function showLoading(container) {
    container.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i> Memproses...</div>`;
    container.classList.add("show");
  }

  // ========== YOUTUBE ==========
  const ytUrl = document.getElementById("ytUrl");
  const ytResult = document.getElementById("ytResult");
  const ytFormatRadios = document.querySelectorAll('input[name="ytFormat"]');

  document
    .querySelector('.btn-download[data-platform="youtube"]')
    .addEventListener("click", async () => {
      const url = ytUrl.value.trim();
      if (!url) return alert("Masukkan URL YouTube.");
      let format = "mp3";
      ytFormatRadios.forEach((r) => {
        if (r.checked) format = r.value;
      });
      showLoading(ytResult);
      try {
        const resp = await fetch("/api/download/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, format }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.message || "Gagal");
        }
        // Karena kita kirim file langsung, kita buat link download dari blob
        const blob = await resp.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const contentDisposition = resp.headers.get("content-disposition");
        let filename = "download." + format;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }
        showResult(
          ytResult,
          `
        <div class="success"><i class="fas fa-check-circle"></i> Siap diunduh</div>
        <div style="margin-top:12px;">
          <a href="${downloadUrl}" class="btn-download" download="${filename}"><i class="fas fa-download"></i> Unduh ${format.toUpperCase()}</a>
        </div>
      `,
        );
        // Kosongkan input setelah download
        ytUrl.value = "";
      } catch (err) {
        showResult(
          ytResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ========== TIKTOK ==========
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
        if (!resp.ok || !data.success)
          throw new Error(data.message || data.error || "Gagal");
        const r = data.data;
        const meta = r.metadata || {};
        const author = r.author || {};
        const stats = r.stats || {};
        const isSlide = r.isSlide || false;

        let html = `<div class="success"><i class="fas fa-check-circle"></i> Berhasil</div>`;
        html += `<div><strong>Deskripsi:</strong> ${escapeHtml(meta.description || "—")}</div>`;
        html += `<div><strong>Author:</strong> ${escapeHtml(author.nickname || author.uniqueId || "—")}</div>`;
        html += `<div><strong>Like:</strong> ${formatNumber(stats.likes)}</div>`;
        html += `<div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">`;

        if (isSlide) {
          // Slide gambar -> satu tombol download semua foto
          const images = r.originalUrl?.images || [];
          if (images.length > 0) {
            html += `<button class="btn-download" id="downloadAllImagesBtn"><i class="fas fa-images"></i> Download Semua Foto (${images.length})</button>`;
          }
          if (r.originalUrl?.audio) {
            html += `<a href="${r.originalUrl.audio}" class="btn-download secondary" target="_blank"><i class="fas fa-music"></i> Download Audio</a>`;
          }
        } else {
          // Video
          const urls = r.originalUrl || {};
          if (urls.hd_nonwatermark) {
            html += `<a href="${urls.hd_nonwatermark}" class="btn-download" target="_blank"><i class="fas fa-video"></i> Download HD</a>`;
          }
          if (urls.watermark) {
            html += `<a href="${urls.watermark}" class="btn-download secondary" target="_blank"><i class="fas fa-water"></i> Download WM</a>`;
          }
          if (r.music && r.music.playUrl) {
            html += `<a href="${r.music.playUrl}" class="btn-download secondary" target="_blank"><i class="fas fa-music"></i> Download Audio</a>`;
          }
          // Cloud URLs jika ada
          if (r.cloudUrl && r.cloudUrl.hd_nonwatermark) {
            html += `<a href="${r.cloudUrl.hd_nonwatermark}" class="btn-download secondary" target="_blank"><i class="fas fa-cloud"></i> Cloud HD</a>`;
          }
          if (r.cloudUrl && r.cloudUrl.watermark) {
            html += `<a href="${r.cloudUrl.watermark}" class="btn-download secondary" target="_blank"><i class="fas fa-cloud"></i> Cloud WM</a>`;
          }
        }
        html += `</div>`;
        showResult(ttResult, html);

        // Jika slide, tambahkan event untuk download semua gambar
        if (isSlide) {
          const images = r.originalUrl?.images || [];
          const btn = document.getElementById("downloadAllImagesBtn");
          if (btn) {
            btn.addEventListener("click", () => {
              images.forEach((img, i) => {
                setTimeout(() => {
                  const a = document.createElement("a");
                  a.href = img;
                  a.download = `tiktok_photo_${i + 1}.jpg`;
                  a.target = "_blank";
                  a.click();
                }, i * 500);
              });
            });
          }
        }

        ttUrl.value = "";
      } catch (err) {
        showResult(
          ttResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ========== SPOTIFY ==========
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
        html += `<div style="margin-top:12px;"><a href="${data.download_url}" class="btn-download" target="_blank"><i class="fas fa-download"></i> Download</a></div>`;
        showResult(spResult, html);
        spUrl.value = "";
      } catch (err) {
        showResult(
          spResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ========== INSTAGRAM ==========
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

        // Pisahkan foto dan video (berdasarkan tipe atau ekstensi)
        const photoLinks = links.filter(
          (l) =>
            l.type.toLowerCase().includes("photo") ||
            l.url.match(/\.(jpg|jpeg|png|gif|webp)/i),
        );
        const videoLinks = links.filter(
          (l) =>
            l.type.toLowerCase().includes("video") ||
            l.url.match(/\.(mp4|mov|avi)/i),
        );

        let html = `<div class="success"><i class="fas fa-check-circle"></i> ${links.length} link ditemukan</div>`;
        html += `<div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">`;
        if (photoLinks.length > 0) {
          html += `<button class="btn-download" id="igDownloadPhotos"><i class="fas fa-images"></i> Download Foto (${photoLinks.length})</button>`;
        }
        if (videoLinks.length > 0) {
          html += `<button class="btn-download secondary" id="igDownloadVideos"><i class="fas fa-video"></i> Download Video (${videoLinks.length})</button>`;
        }
        html += `</div>`;
        showResult(igResult, html);

        // Event untuk download foto
        const photoBtn = document.getElementById("igDownloadPhotos");
        if (photoBtn) {
          photoBtn.addEventListener("click", () => {
            photoLinks.forEach((link, i) => {
              setTimeout(() => {
                const a = document.createElement("a");
                a.href = link.url;
                a.download = `ig_photo_${i + 1}.jpg`;
                a.target = "_blank";
                a.click();
              }, i * 500);
            });
          });
        }
        const videoBtn = document.getElementById("igDownloadVideos");
        if (videoBtn) {
          videoBtn.addEventListener("click", () => {
            videoLinks.forEach((link, i) => {
              setTimeout(() => {
                const a = document.createElement("a");
                a.href = link.url;
                a.download = `ig_video_${i + 1}.mp4`;
                a.target = "_blank";
                a.click();
              }, i * 500);
            });
          });
        }

        igUrl.value = "";
      } catch (err) {
        showResult(
          igResult,
          `<div class="error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</div>`,
        );
      }
    });

  // ========== CONVERT (OTOMATIS) ==========
  let selectedFile = null;
  let isUploading = false;

  function initConvert() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const uploadProgress = document.getElementById("uploadProgress");
    const linkHistory = document.getElementById("linkHistory");

    // Hapus event listener lama dengan clone
    const newUploadArea = uploadArea.cloneNode(true);
    uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
    const newFileInput = document.getElementById("fileInput");

    // Load history
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

    function resetUploadArea() {
      selectedFile = null;
      newFileInput.value = "";
      newUploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drag & drop gambar di sini</h3>
        <p>atau klik untuk memilih file (JPG, PNG, GIF, dll.)</p>
        <input type="file" id="fileInput" accept="image/*" style="display:none;" />
      `;
      // Re-attach events
      initConvert();
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

    // Event listeners
    newUploadArea.addEventListener("click", () => {
      const inp = document.getElementById("fileInput");
      if (inp) inp.click();
    });

    const fileInputElem = document.getElementById("fileInput");
    if (fileInputElem) {
      fileInputElem.addEventListener("change", (e) => {
        if (e.target.files.length) {
          const file = e.target.files[0];
          selectedFile = file;
          newUploadArea.innerHTML = `<i class="fas fa-check-circle" style="color:#51cf66;"></i><h3>${escapeHtml(file.name)}</h3><p>${(file.size / 1024).toFixed(0)} KB</p>`;
          autoUpload(file);
        }
      });
    }

    newUploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      newUploadArea.classList.add("dragover");
    });
    newUploadArea.addEventListener("dragleave", () => {
      newUploadArea.classList.remove("dragover");
    });
    newUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      newUploadArea.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        selectedFile = file;
        newUploadArea.innerHTML = `<i class="fas fa-check-circle" style="color:#51cf66;"></i><h3>${escapeHtml(file.name)}</h3><p>${(file.size / 1024).toFixed(0)} KB</p>`;
        autoUpload(file);
      }
    });

    loadHistory();
  }

  initConvert();

  // ========== ENTER KEY ==========
  document.querySelectorAll(".input-group input").forEach((inp) => {
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const btn = inp.closest(".input-group").querySelector(".btn-download");
        if (btn) btn.click();
      }
    });
  });

  console.log("🚀 Zeanova Library siap!");
})();
