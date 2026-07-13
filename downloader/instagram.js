const axios = require("axios");

async function getDynamicApiKey() {
  const htmlRes = await axios.get("https://instaddl.com/", { timeout: 30000 });
  const scriptMatch = htmlRes.data.match(
    /src="([^"]*assets\/index-[^"]*\.js)"/,
  );
  if (!scriptMatch) throw new Error("Failed to find script URL");
  const jsUrl = "https://instaddl.com" + scriptMatch[1];
  const jsRes = await axios.get(jsUrl, { timeout: 30000 });
  const keyMatch = jsRes.data.match(
    /(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[^"'\s]+)/,
  );
  if (!keyMatch) throw new Error("Failed to extract API key");
  return keyMatch[1];
}

function extractLinks(data) {
  let links = [];
  if (Array.isArray(data)) {
    links = data.map((item) => ({
      url: item.url || item,
      type:
        item.type ||
        (item.url && (item.url.includes(".mp4") ? "video" : "photo")),
    }));
  } else if (typeof data === "object" && data !== null) {
    if (data.images) {
      data.images.forEach((img) => links.push({ url: img, type: "photo" }));
    }
    if (data.videos) {
      data.videos.forEach((vid) => links.push({ url: vid, type: "video" }));
    }
    if (data.url) {
      links.push({ url: data.url, type: data.type || "photo" });
    }
    // Coba cari semua properti yang nilainya URL
    for (const key of Object.keys(data)) {
      if (typeof data[key] === "string" && data[key].startsWith("http")) {
        if (data[key].includes(".mp4")) {
          links.push({ url: data[key], type: "video" });
        } else {
          links.push({ url: data[key], type: "photo" });
        }
      }
    }
  }
  return links;
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
        timeout: 60000,
      },
    );

    // Jika langsung dapat data, return
    if (create.success && create.data) {
      const links = extractLinks(create.data);
      if (links.length > 0) {
        return { success: true, data: links };
      }
    }

    // Polling lebih lama (60 detik)
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
          const links = extractLinks(result.data);
          if (links.length > 0) {
            return { success: true, data: links };
          }
        }
      } catch (pollErr) {
        // Lanjut polling
      }
    }

    // Fallback: coba ambil dari response pertama
    if (create.data) {
      const links = extractLinks(create.data);
      if (links.length > 0) {
        return { success: true, data: links };
      }
    }

    throw new Error("Tidak ada link ditemukan atau timeout");
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { downloadInstagram };
