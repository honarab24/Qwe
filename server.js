import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Your target M3U8 URL
const targetUrl = "https://5nhp186eg31fofnc.chinese-restaurant-api.site/v3/variant/VE1AO1NTbu8mbv12LxEWM21ycrNWYyR3LwQ2M3ITOxEDNiRDMtUjZiFWLiF2N00CZ5gTZtYmNyUGO0IGO/master.m3u8";

// Proxy endpoint
app.get("/stream.m3u8", async (req, res) => {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20220104 Firefox/134.0",
        "Origin": "https://ppvs.su",
        "Referer": "https://ppvs.su",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch stream");
    }

    // Set correct content type for HLS playlist
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching the stream");
  }
});

// For .ts / .m4s / .mp4 segments
app.get("/segment/:name", async (req, res) => {
  try {
    const segmentUrl = targetUrl.replace("master.m3u8", req.params.name);
    const response = await fetch(segmentUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20220104 Firefox/134.0",
        "Origin": "https://ppvs.su",
        "Referer": "https://ppvs.su",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch segment");
    }

    res.set("Content-Type", "video/MP2T");
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching segment");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
