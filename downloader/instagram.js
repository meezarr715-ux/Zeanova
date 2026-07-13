const axios = require("axios");

async function getDynamicApiKey() {
  const htmlRes = await axios.get("https://instaddl.com/");
  const scriptMatch = htmlRes.data.match(
    /src="([^"]*assets\/index-[^"]*\.js)"/,
  );
  if (!scriptMatch) throw new Error("Failed to find script URL");
  const jsUrl = "https://instaddl.com" + scriptMatch[1];
  const jsRes = await axios.get(jsUrl);
  const keyMatch = jsRes.data.match(
    /(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[^"'\s]+)/,
  );
  if (!keyMatch) throw new Error("Failed to extract API key");
  return keyMatch[1];
}

async function downloadInstagram(url) {
  try {
    const apiKey = await getDynamicApiKey();
    const authorization = `Bearer ${apiKey}`;

    const { data: create } = await axios.post(
      "https://eoehwyffvhpmvpeblkbi.supabase.co/functions/v1/instagram-fetch",
      { url },
      {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
          origin: "https://instaddl.com",
          referer: "https://instaddl.com/",
          "content-type": "application/json",
          "x-client-info": "supabase-js-web/2.58.0",
          apikey: apiKey,
          authorization: authorization,
        },
        timeout: 30000,
      },
    );

    if (!create.success) throw new Error("Gagal memulai fetch");

    // Polling dengan interval 1.5 detik, max 20 kali (30 detik)
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const { data: result } = await axios.post(
          "https://eoehwyffvhpmvpeblkbi.supabase.co/functions/v1/instagram-poll",
          { runId: create.runId, datasetId: create.datasetId, url },
          {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
              origin: "https://instaddl.com",
              referer: "https://instaddl.com/",
              "content-type": "application/json",
              "x-client-info": "supabase-js-web/2.58.0",
              apikey: apiKey,
              authorization: authorization,
            },
            timeout: 30000,
          },
        );

        if (result.data && !result.pending) {
          let links = [];
          // Jika result.data adalah array dengan objek { url, type }
          if (Array.isArray(result.data)) {
            links = result.data.map((item) => ({
              url: item.url || item,
              type:
                item.type ||
                (item.url && (item.url.includes(".mp4") ? "video" : "photo")),
            }));
          } else if (typeof result.data === "object") {
            // Cek berbagai format
            if (result.data.images) {
              if (Array.isArray(result.data.images)) {
                result.data.images.forEach((img) =>
                  links.push({ url: img, type: "photo" }),
                );
              } else {
                // Jika images adalah object dengan key
                Object.values(result.data.images).forEach((img) => {
                  if (img) links.push({ url: img, type: "photo" });
                });
              }
            }
            if (result.data.videos) {
              if (Array.isArray(result.data.videos)) {
                result.data.videos.forEach((vid) =>
                  links.push({ url: vid, type: "video" }),
                );
              } else {
                Object.values(result.data.videos).forEach((vid) => {
                  if (vid) links.push({ url: vid, type: "video" });
                });
              }
            }
            if (result.data.url) {
              links.push({
                url: result.data.url,
                type: result.data.type || "photo",
              });
            }
          }
          if (links.length > 0) {
            return { success: true, data: links };
          }
        }
      } catch (pollErr) {
        console.log("Polling error, retry...", pollErr.message);
      }
    }

    // Fallback: coba ambil dari response pertama jika ada data
    if (create.data && create.data.length > 0) {
      const links = create.data.map((item) => ({
        url: item.url || item,
        type:
          item.type ||
          (item.url && (item.url.includes(".mp4") ? "video" : "photo")),
      }));
      if (links.length > 0) {
        return { success: true, data: links };
      }
    }

    throw new Error("Timeout menunggu hasil atau tidak ada link ditemukan");
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { downloadInstagram };
