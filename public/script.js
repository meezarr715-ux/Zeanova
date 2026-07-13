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

  function resetAllState() {
    sessionStorage.removeItem("zeanova_links");
    const linkHistory = document.getElementById("linkHistory");
    if (linkHistory) {
      linkHistory.innerHTML = `<div class="empty-msg">Belum ada link yang dihasilkan.</div>`;
    }
    document.querySelectorAll(".result-box").forEach((box) => {
      box.classList.remove("show");
      box.innerHTML = "";
    });
    document
      .querySelectorAll(".input-group input")
      .forEach((inp) => (inp.value = ""));
    const progress = document.getElementById("uploadProgress");
    if (progress) progress.style.width = "0%";
    const uploadArea = document.getElementById("uploadArea");
    if (uploadArea) {
      uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drag & drop gambar di sini</h3>
        <p>atau klik untuk memilih file (JPG, PNG, GIF, dll.)</p>
        <input type="file" id="fileInput" accept="image/*" multiple style="display:none;" />
      `;
      initConvert();
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
        const blob = await resp.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const contentDisposition = resp.headers.get("content-disposition");
        let filename = "download." + format;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        }

        // Tampilkan thumbnail dari YouTube (gunakan embed)
        const videoId = url.match(
          /(?:youtu\.be\/|youtube\.com\/(?:embed\/|live\/|shorts\/)|[?&]v=)([a-zA-Z0-9-_]{11})/,
        );
        const thumbnail = videoId
          ? `https://img.youtube.com/vi/${videoId[1]}/hqdefault.jpg`
          : "";

        let html = `<div class="success"><i class="fas fa-check-circle"></i> Siap diunduh</div>`;
        if (thumbnail) {
          html += `<div style="margin:12px 0;"><img src="${thumbnail}" alt="Thumbnail" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid var(--border-glow);" /></div>`;
        }
        html += `<div style="margin-top:8px;"><strong>Judul:</strong> ${escapeHtml(filename.replace(/\.[^.]+$/, ""))}</div>`;
        html += `<div style="margin-top:12px;">
        <a href="${downloadUrl}" class="btn-download" download="${filename}"><i class="fas fa-download"></i> Unduh ${format.toUpperCase()}</a>
      </div>`;
        showResult(ytResult, html);
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
        const isImage = r.type === "image";
        const download = r.download || {};
        const stats = r.stats || {};
        const author = r.author || {};

        let html = `<div class="success"><i class="fas fa-check-circle"></i> Berhasil</div>`;

        // Tampilkan media preview (cover/slides)
        if (isImage && r.slides && r.slides.length > 0) {
          html += `<div style="margin:12px 0; display:flex; flex-wrap:wrap; gap:8px; max-height:200px; overflow-y:auto;">`;
          r.slides.slice(0, 4).forEach((img) => {
            html += `<img src="${img}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid var(--border-glow);" />`;
          });
          if (r.slides.length > 4) {
            html += `<div style="display:flex; align-items:center; color:var(--text-secondary);">+${r.slides.length - 4} lagi</div>`;
          }
          html += `</div>`;
        } else if (r.cover) {
          html += `<div style="margin:12px 0;"><img src="${r.cover}" alt="Cover" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid var(--border-glow);" /></div>`;
        }

        html += `<div><strong>Deskripsi:</strong> ${escapeHtml(r.title || "—")}</div>`;
        html += `<div><strong>Author:</strong> ${escapeHtml(author.nickname || author.username || "—")}</div>`;
        html += `<div><strong>Like:</strong> ${formatNumber(stats.likes)}</div>`;
        html += `<div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">`;

        if (isImage && r.slides && r.slides.length > 0) {
          html += `<button class="btn-download" id="ttDownloadSlides"><i class="fas fa-images"></i> Download Semua Foto (${r.slides.length})</button>`;
          if (r.music) {
            html += `<a href="${r.music}" class="btn-download secondary" target="_blank"><i class="fas fa-music"></i> Download Audio</a>`;
          }
        } else {
          if (download.no_watermark_hd) {
            html += `<a href="${download.no_watermark_hd}" class="btn-download" target="_blank"><i class="fas fa-video"></i> Download HD</a>`;
          }
          if (download.no_watermark) {
            html += `<a href="${download.no_watermark}" class="btn-download secondary" target="_blank"><i class="fas fa-video"></i> Download No WM</a>`;
          }
          if (download.watermark) {
            html += `<a href="${download.watermark}" class="btn-download secondary" target="_blank"><i class="fas fa-water"></i> Download WM</a>`;
          }
          if (r.music) {
            html += `<a href="${r.music}" class="btn-download secondary" target="_blank"><i class="fas fa-music"></i> Download Audio</a>`;
          }
        }
        html += `</div>`;
        showResult(ttResult, html);

        if (isImage && r.slides) {
          const btn = document.getElementById("ttDownloadSlides");
          if (btn) {
            btn.addEventListener("click", () => {
              r.slides.forEach((img, i) => {
                setTimeout(() => {
                  const a = document.createElement("a");
                  a.href = img;
                  a.download = `tiktok_slide_${i + 1}.jpg`;
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

        // Tampilkan gambar album
        if (data.metadata && data.metadata.image) {
          html += `<div style="margin:12px 0;"><img src="${data.metadata.image}" alt="Album" style="max-width:200px; max-height:200px; border-radius:8px; border:1px solid var(--border-glow);" /></div>`;
        }

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
        if (!resp.ok || !data.success)
          throw new Error(data.message || data.error || "Gagal");
        const links = data.data || [];
        if (!Array.isArray(links) || links.length === 0)
          throw new Error("Tidak ada link ditemukan");

        const photoLinks = links.filter(
          (l) =>
            l.type === "photo" ||
            (typeof l === "string" && !l.includes(".mp4")),
        );
        const videoLinks = links.filter(
          (l) =>
            l.type === "video" || (typeof l === "string" && l.includes(".mp4")),
        );

        let html = `<div class="success"><i class="fas fa-check-circle"></i> ${links.length} link ditemukan</div>`;

        // Tampilkan preview media (max 4 foto/video thumbnail)
        html += `<div style="margin:12px 0; display:flex; flex-wrap:wrap; gap:8px; max-height:200px; overflow-y:auto;">`;
        const previewItems = links.slice(0, 4);
        previewItems.forEach((item) => {
          const url = typeof item === "string" ? item : item.url;
          const isVideo = url.includes(".mp4") || item.type === "video";
          if (isVideo) {
            html += `<video src="${url}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid var(--border-glow);" muted></video>`;
          } else {
            html += `<img src="${url}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid var(--border-glow);" />`;
          }
        });
        if (links.length > 4) {
          html += `<div style="display:flex; align-items:center; color:var(--text-secondary);">+${links.length - 4} lagi</div>`;
        }
        html += `</div>`;

        html += `<div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">`;
        if (photoLinks.length > 0) {
          html += `<button class="btn-download" id="igDownloadPhotos"><i class="fas fa-images"></i> Download Foto (${photoLinks.length})</button>`;
        }
        if (videoLinks.length > 0) {
          html += `<button class="btn-download secondary" id="igDownloadVideos"><i class="fas fa-video"></i> Download Video (${videoLinks.length})</button>`;
        }
        html += `</div>`;
        showResult(igResult, html);

        const photoBtn = document.getElementById("igDownloadPhotos");
        if (photoBtn) {
          photoBtn.addEventListener("click", () => {
            photoLinks.forEach((item, i) => {
              const url = typeof item === "string" ? item : item.url;
              setTimeout(() => {
                const a = document.createElement("a");
                a.href = url;
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
            videoLinks.forEach((item, i) => {
              const url = typeof item === "string" ? item : item.url;
              setTimeout(() => {
                const a = document.createElement("a");
                a.href = url;
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

  // ========== CONVERT (OTOMATIS + MULTIPLE FILE) ==========
  let selectedFiles = [];
  let isUploading = false;

  function initConvert() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const uploadProgress = document.getElementById("uploadProgress");
    const linkHistory = document.getElementById("linkHistory");

    const newUploadArea = uploadArea.cloneNode(true);
    uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
    const newFileInput = document.getElementById("fileInput");

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
      selectedFiles = [];
      if (newFileInput) newFileInput.value = "";
      newUploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drag & drop gambar di sini</h3>
        <p>atau klik untuk memilih file (JPG, PNG, GIF, dll.)</p>
        <input type="file" id="fileInput" accept="image/*" multiple style="display:none;" />
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
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.success) {
                addLinkToHistory(file.name, data.url);
                uploadProgress.style.width = "100%";
                // Proses file berikutnya
                processNextFile();
              } else {
                alert("Upload gagal: " + (data.message || "Unknown error"));
                processNextFile();
              }
            } catch (e) {
              alert("Respon server tidak valid");
              processNextFile();
            }
          } else {
            alert("Server error: " + xhr.status);
            processNextFile();
          }
        };
        xhr.onerror = () => {
          alert("Gagal terhubung ke server.");
          processNextFile();
        };
        xhr.send(formData);
      } catch (err) {
        alert("Error: " + err.message);
        processNextFile();
      }
    }

    function processNextFile() {
      if (selectedFiles.length > 0) {
        const nextFile = selectedFiles.shift();
        autoUpload(nextFile);
      } else {
        isUploading = false;
        resetUploadArea();
        uploadProgress.style.width = "0%";
      }
    }

    // Event listeners
    newUploadArea.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("a")) return;
      const inp = document.getElementById("fileInput");
      if (inp) inp.click();
    });

    if (newFileInput) {
      newFileInput.addEventListener("change", (e) => {
        if (e.target.files.length) {
          const files = Array.from(e.target.files);
          selectedFiles = files;

          // Tampilkan nama file di area
          let fileNames = files.map((f) => f.name).join(", ");
          if (fileNames.length > 50)
            fileNames = fileNames.substring(0, 50) + "...";
          newUploadArea.innerHTML = `<i class="fas fa-check-circle" style="color:#51cf66;"></i><h3>${files.length} file dipilih</h3><p>${escapeHtml(fileNames)}</p>`;

          // Mulai upload otomatis
          if (!isUploading) {
            processNextFile();
          }
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
        const files = Array.from(e.dataTransfer.files);
        selectedFiles = files;
        let fileNames = files.map((f) => f.name).join(", ");
        if (fileNames.length > 50)
          fileNames = fileNames.substring(0, 50) + "...";
        newUploadArea.innerHTML = `<i class="fas fa-check-circle" style="color:#51cf66;"></i><h3>${files.length} file dipilih</h3><p>${escapeHtml(fileNames)}</p>`;

        if (!isUploading) {
          processNextFile();
        }
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
