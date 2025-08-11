import express from "express";
import fetch from "node-fetch";
import { URL } from "url";

const app = express();

const SOURCE_URL = "https://zekonew.newkso.ru/zeko/premium44/mono.m3u8";
const HEADERS = {
  "Host": "zekonew.newkso.ru",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
  "Origin": "https://jxoplay.xyz",
  "Referer": "https://jxoplay.xyz/"
};

// Proxy main playlist and rewrite segment URLs
app.get("/stream.m3u8", async (req, res) => {
  try {
    const response = await fetch(SOURCE_URL, { headers: HEADERS });
    if (!response.ok) return res.status(response.status).send("Failed to fetch stream");

    let playlist = await response.text();

    // Base URL for segments
    const baseUrl = new URL(SOURCE_URL);

    // Rewrite all segment/playlist URLs to go through our /segment.ts
    playlist = playlist.replace(
      /^(?!#)(.*\.m3u8|.*\.ts)/gm,
      match => `/segment.ts?url=${encodeURIComponent(new URL(match, baseUrl).href)}`
    );

    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.send(playlist);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Proxy segments and sub-playlists
app.get("/segment.ts", async (req, res) => {
  const segmentUrl = req.query.url;
  if (!segmentUrl) return res.status(400).send("Missing url");

  try {
    const response = await fetch(segmentUrl, { headers: HEADERS });
    if (!response.ok) return res.status(response.status).send("Failed to fetch segment");

    const contentType = response.headers.get("content-type") || "video/mp2t";
    res.set("Content-Type", contentType);
    response.body.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
