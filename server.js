import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

function getRandomUserAgent() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function fetchWithRetry(url, options, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        lastError = new Error(`Server responded with ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

app.get("/:videoId/:type?/:rest*", async (req, res) => {
  const { videoId, type, rest } = req.params;

  try {
    // Handle segment proxy
    if (type === "seg" && rest) {
      const segmentUrl = decodeURIComponent(rest);
      const headers = {
        "User-Agent": getRandomUserAgent(),
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache"
      };

      if (segmentUrl.endsWith(".m3u8")) {
        const r = await fetchWithRetry(segmentUrl, { headers });
        if (!r.ok) throw new Error(`Playlist fetch failed: ${r.status}`);
        const playlist = await r.text();
        const baseUrl = new URL(segmentUrl).origin + new URL(segmentUrl).pathname.replace(/[^/]+$/, "");
        const workerBase = `${req.protocol}://${req.get("host")}/${videoId}/seg/`;

        const rewritten = playlist.replace(/^(?!#)([^\s]+)$/gm, (m) => {
          const absolute = m.startsWith("http") ? m : baseUrl + m;
          return workerBase + encodeURIComponent(absolute);
        });

        res.set({
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*"
        });
        return res.send(rewritten);
      }

      const segRes = await fetchWithRetry(segmentUrl, { headers });
      if (!segRes.ok) throw new Error(`Segment fetch failed: ${segRes.status}`);
      res.set("Access-Control-Allow-Origin", "*");
      if (!res.get("Content-Type")) {
        if (segmentUrl.endsWith(".ts")) res.type("video/MP2T");
        else if (segmentUrl.endsWith(".m4s")) res.type("video/mp4");
      }
      return segRes.body.pipe(res);
    }

    // Fetch YouTube page
    const ytInfoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytPage = await fetchWithRetry(ytInfoUrl, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!ytPage.ok) throw new Error(`YouTube fetch failed: ${ytPage.status}`);
    const text = await ytPage.text();

    // Extract manifest URL
    let manifestUrl = null;
    const patterns = [
      /"hlsManifestUrl":"(https:[^"]+\.m3u8)"/,
      /"url":"(https:\/\/[^"]+\/manifest\/hls_[^"]+\/playlist\.m3u8)"/,
      /"hlsManifestUrl":\s*"([^"]+\.m3u8)"/
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        manifestUrl = m[1].replace(/\\u0026/g, "&");
        break;
      }
    }

    if (!manifestUrl) throw new Error("No HLS manifest found");

    // Fetch master playlist
    const masterRes = await fetchWithRetry(manifestUrl, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Referer": "https://www.youtube.com/"
      }
    });
    if (!masterRes.ok) throw new Error(`Master fetch failed: ${masterRes.status}`);
    const masterPlaylist = await masterRes.text();

    const workerBase = `${req.protocol}://${req.get("host")}/${videoId}/seg/`;
    const rewrittenMaster = masterPlaylist.replace(/(https?:\/\/[^\s"]+)/g, (m) =>
      workerBase + encodeURIComponent(m)
    );

    res.set({
      "Content-Type": "application/vnd.apple.mpegurl",
      "Access-Control-Allow-Origin": "*"
    });
    res.send(rewrittenMaster);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
