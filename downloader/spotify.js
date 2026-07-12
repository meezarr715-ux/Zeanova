const axios = require("axios");

async function downloadTrack(trackUrl) {
  try {
    const res = await axios.post(
      "https://spotyloader.com/api/spotify/track",
      { url: trackUrl },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      },
    );
    const trackId = res.data.jobId;
    if (!trackId)
      return {
        success: false,
        error: "Gagal mendapatkan job ID",
        url: trackUrl,
      };
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await axios.get(
        `https://spotyloader.com/api/spotify/track/status/${trackId}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
        },
      );
      const data = statusRes.data;
      if (data.status === "ready" || data.status === "success") {
        const downloadUrl =
          data.downloadLink ||
          data.downloadUrl ||
          (data.post && data.post.download_url);
        if (downloadUrl) {
          return {
            success: true,
            download_url: downloadUrl,
            metadata: data.post
              ? {
                  title: data.post.name || "Unknown",
                  artist: data.post.artist || "Unknown",
                  album: data.post.album || "Unknown",
                  image: data.post.image || "",
                }
              : null,
          };
        }
      } else if (data.status === "error" || data.status === "failed") {
        return {
          success: false,
          error: "Konversi gagal di server",
          url: trackUrl,
        };
      }
    }
    return {
      success: false,
      error: "Timeout menunggu konversi",
      url: trackUrl,
    };
  } catch (error) {
    try {
      const fallbackRes = await axios.get(
        `https://api.spotifydown.com/download/${trackUrl}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
        },
      );
      if (fallbackRes.data && fallbackRes.data.link) {
        return {
          success: true,
          download_url: fallbackRes.data.link,
          metadata: {
            title: fallbackRes.data.title || "Unknown",
            artist: fallbackRes.data.artist || "Unknown",
            album: fallbackRes.data.album || "Unknown",
          },
        };
      }
    } catch (e) {
      // Gagal juga, return error
    }
    return {
      success: false,
      error: error.message || "Gagal mengunduh Spotify",
      url: trackUrl,
    };
  }
}

async function downloadSpotify(url) {
  if (url.includes("/album/") || url.includes("/playlist/")) {
    return {
      success: false,
      error: "Album/Playlist tidak didukung, hanya single track.",
    };
  }
  return await downloadTrack(url);
}

module.exports = { downloadSpotify };
