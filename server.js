import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/stream.m3u8", async (req, res) => {
  try {
    const targetUrl = "https://zekonew.newkso.ru/zeko/premium44/mono.m3u8";

    const response = await fetch(targetUrl, {
      headers: {
        "Host": "zekonew.newkso.ru",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
        "Origin": "https://jxoplay.xyz",
        "Referer": "https://jxoplay.xyz/",
      }
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch stream");
    }

    // Pass headers for HLS
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.send(await response.text());

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// For .ts segments proxy
app.get("/segment.ts", async (req, res) => {
  const segmentUrl = req.query.url;
  if (!segmentUrl) return res.status(400).send("Missing url");

  try {
    const response = await fetch(segmentUrl, {
      headers: {
        "Host": "zekonew.newkso.ru",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
        "Origin": "https://jxoplay.xyz",
        "Referer": "https://jxoplay.xyz/",
      }
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch segment");
    }

    res.set("Content-Type", "video/mp2t");
    response.body.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
