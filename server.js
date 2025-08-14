import express from "express";
import fetch from "node-fetch";
import { PassThrough } from "stream";

const app = express();
const PORT = process.env.PORT || 3000;

// Base source configuration
const SOURCE_URL =
  "https://5nhp186eg31fofnc.chinese-restaurant-api.site/v3/variant/VE1AO1NTbu8mbv12LxEWM21ycrNWYyR3LwQ2M3ITOxEDNiRDMtUjZiFWLiF2N00CZ5gTZtYmNyUGO0IGO/master.m3u8";

const CUSTOM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20220104 Firefox/134.0",
  Origin: "https://ppvs.su",
  Referer: "https://ppvs.su",
  Connection: "keep-alive",
};

/**
 * Restreams the HLS playlist and segments with correct headers
 */
app.get("/stream.m3u8", async (req, res) => {
  try {
    const response = await fetch(SOURCE_URL, { headers: CUSTOM_HEADERS });
    if (!response.ok) throw new Error("Failed to fetch playlist");

    let body = await response.text();

    // Rewrite relative segment URLs to go through our proxy
    body = body.replace(
      /(.*\.ts)/g,
      (match) => `/segment/${encodeURIComponent(match)}`
    );

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(body);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching playlist");
  }
});

/**
 * Proxies the video segments
 */
app.get("/segment/:name", async (req, res) => {
  const segmentName = decodeURIComponent(req.params.name);
  const segmentUrl = new URL(segmentName, SOURCE_URL).href;

  try {
    const response = await fetch(segmentUrl, { headers: CUSTOM_HEADERS });
    if (!response.ok) throw new Error("Failed to fetch segment");

    res.setHeader("Content-Type", "video/mp2t");
    const passthrough = new PassThrough();
    response.body.pipe(passthrough);
    passthrough.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching segment");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Restream server running on port ${PORT}`);
});
