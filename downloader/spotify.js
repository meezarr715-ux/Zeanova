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
      return { success: false, error: "Failed to get job ID", url: trackUrl };
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
                  title: data.post.name,
                  artist: data.post.artist,
                  album: data.post.album,
                  image: data.post.image,
                }
              : null,
          };
        }
      } else if (data.status === "error" || data.status === "failed") {
        return { success: false, error: "Conversion failed", url: trackUrl };
      }
    }
    return { success: false, error: "Timeout", url: trackUrl };
  } catch (error) {
    return { success: false, error: error.message, url: trackUrl };
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
