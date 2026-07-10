const axios = require("axios");
const cheerio = require("cheerio");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const FormData = require("form-data");
const { createReadStream, existsSync } = require("fs");

const UPLOAD_URL = "https://www.cloudsky.biz.id/api/public/upload";
const BASE_FILE_URL = "https://www.cloudsky.biz.id/api/file";

async function uploadFile(fileInput, fileName = null) {
  try {
    const form = new FormData();
    if (Buffer.isBuffer(fileInput)) {
      if (!fileName)
        throw new Error("fileName wajib disertakan jika menggunakan Buffer");
      form.append("file", fileInput, { filename: fileName });
    } else if (typeof fileInput === "string") {
      if (!existsSync(fileInput))
        throw new Error(`File tidak ditemukan di path: ${fileInput}`);
      form.append("file", createReadStream(fileInput));
    } else {
      throw new Error(
        "Input tidak valid: harus berupa path file (string) atau Buffer",
      );
    }

    const response = await axios.post(UPLOAD_URL, form, {
      headers: { ...form.getHeaders() },
    });

    if (response.data && response.data.success) {
      const fileKey = response.data.data.key;
      return {
        success: true,
        message: "Upload berhasil",
        data: { ...response.data.data, url: `${BASE_FILE_URL}/${fileKey}` },
      };
    }
    throw new Error(response.data.message || "Upload gagal dari server");
  } catch (error) {
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Terjadi kesalahan saat upload",
    };
  }
}

async function getBuffer(url, apiInstance) {
  try {
    const response = await apiInstance.get(url, {
      responseType: "arraybuffer",
      headers: {
        Referer: "https://www.tiktok.com/",
        Range: "bytes=0-",
      },
    });
    return Buffer.from(response.data);
  } catch (e) {
    console.error(`[Download Error]:`, e.message);
    return null;
  }
}

async function downloadTiktok(url) {
  const jar = new CookieJar();
  const api = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    }),
  );

  try {
    const htmlResponse = await api.get(url);
    const $ = cheerio.load(htmlResponse.data);

    const scriptContent =
      $("#__UNIVERSAL_DATA_FOR_REHYDRATION__").html() ||
      $("#SIGI_STATE").html();
    if (!scriptContent) throw new Error("Script tag data tidak ditemukan.");

    const jsonData = JSON.parse(scriptContent);
    const defaultScope = jsonData?.__DEFAULT_SCOPE__;
    const itemStruct =
      defaultScope?.["webapp.reflow.video.detail"]?.itemInfo?.itemStruct ||
      defaultScope?.["webapp.video-detail"]?.itemInfo?.itemStruct ||
      Object.values(jsonData.ItemModule || {})[0];

    if (!itemStruct)
      throw new Error("Struct video tidak ditemukan dalam JSON.");

    const videoId = itemStruct.id;
    const isSlide = !!itemStruct.imagePost;

    const metadata = {
      id: videoId,
      type: isSlide ? "image_slide" : "video",
      description: itemStruct.desc,
      createTime: new Date(itemStruct.createTime * 1000).toLocaleString(),
      region: itemStruct.locationCreated || "N/A",
      hashtags:
        itemStruct.challenges?.map((tag) => ({
          id: tag.id,
          name: tag.title,
        })) || [],
    };
    const author = {
      id: itemStruct.author?.id,
      uniqueId: itemStruct.author?.uniqueId,
      nickname: itemStruct.author?.nickname,
      signature: itemStruct.author?.signature,
      avatar: itemStruct.author?.avatarLarger || itemStruct.author?.avatarThumb,
      verified: itemStruct.author?.verified,
    };
    const stats = {
      views: itemStruct.statsV2?.playCount || itemStruct.stats?.playCount,
      likes: itemStruct.statsV2?.diggCount || itemStruct.stats?.diggCount,
      comments:
        itemStruct.statsV2?.commentCount || itemStruct.stats?.commentCount,
      shares: itemStruct.statsV2?.shareCount || itemStruct.stats?.shareCount,
      saves: itemStruct.statsV2?.collectCount || itemStruct.stats?.collectCount,
    };

    if (isSlide) {
      const imagesList = itemStruct.imagePost.images.map(
        (img) => img.imageURL.urlList[0],
      );
      const audioUrl = itemStruct.music?.playUrl;

      const finalResult = {
        metadata,
        originalUrl: { images: imagesList, audio: audioUrl },
        author,
        music: {
          id: itemStruct.music?.id,
          title: itemStruct.music?.title,
          author: itemStruct.music?.authorName,
          cover: itemStruct.music?.coverLarge,
          playUrl: audioUrl,
          isOriginal: itemStruct.music?.original,
        },
        stats,
      };

      return { status: true, result: finalResult };
    }

    const videoData = itemStruct.video;
    const watermarkUrl = videoData.downloadAddr || videoData.playAddr;
    let hdNoWatermarkUrl = null;
    let bitrateLabel = 0;
    let qualityLabel = "Original";

    if (videoData.bitrateInfo && Array.isArray(videoData.bitrateInfo)) {
      const bestQuality = [...videoData.bitrateInfo].sort(
        (a, b) => b.Bitrate - a.Bitrate,
      )[0];
      if (bestQuality) {
        bitrateLabel = bestQuality.Bitrate;
        qualityLabel = bestQuality.QualityType;
        const urlList = bestQuality.PlayAddr?.UrlList || [];
        hdNoWatermarkUrl =
          urlList.find((u) => u.includes("aweme/v1/play")) ||
          urlList[urlList.length - 1];
      }
    }
    if (!hdNoWatermarkUrl) hdNoWatermarkUrl = videoData.playAddr;

    const finalResult = {
      metadata,
      originalUrl: {
        watermark: watermarkUrl,
        hd_nonwatermark: hdNoWatermarkUrl,
      },
      cloudUrl: {
        watermark: null,
        hd_nonwatermark: null,
      },
      videoInfo: {
        duration: videoData?.duration,
        resolution: `${videoData?.width}x${videoData?.height}`,
        format: videoData?.format,
        codec: videoData?.codecType,
        bitrate: bitrateLabel,
        quality: qualityLabel,
        cover: {
          static: videoData?.cover,
          dynamic: videoData?.dynamicCover,
          origin: videoData?.originCover,
        },
      },
      author,
      music: {
        id: itemStruct.music?.id,
        title: itemStruct.music?.title,
        author: itemStruct.music?.authorName,
        cover: itemStruct.music?.coverLarge,
        playUrl: itemStruct.music?.playUrl,
        isOriginal: itemStruct.music?.original,
      },
      stats,
    };

    if (watermarkUrl) {
      const wmBuffer = await getBuffer(watermarkUrl, api);
      if (wmBuffer) {
        const upload = await uploadFile(wmBuffer, `tiktok_wm_${videoId}.mp4`);
        if (upload.success) finalResult.cloudUrl.watermark = upload.data.url;
        else console.error(`[Upload WM Error]:`, upload.message);
      }
    }

    if (hdNoWatermarkUrl) {
      const hdBuffer = await getBuffer(hdNoWatermarkUrl, api);
      if (hdBuffer) {
        const upload = await uploadFile(hdBuffer, `tiktok_hd_${videoId}.mp4`);
        if (upload.success)
          finalResult.cloudUrl.hd_nonwatermark = upload.data.url;
        else console.error(`[Upload HD Error]:`, upload.message);
      }
    }

    return { status: true, result: finalResult };
  } catch (error) {
    console.error("Error Main Process:", error.message);
    return { status: false, error: error.message };
  }
}

module.exports = { downloadTiktok };
