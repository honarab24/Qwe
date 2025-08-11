import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Random User-Agent
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

// Retry fetch
async function fetchWithRetry(url, options, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      const res = await fetch(url, options);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        lastError = new Error(`Server responded with ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (i === retries - 1) break;
    }
  }
  throw lastError || new Error('Max retries exceeded');
}

// Handle requests
app.get("/:videoId/:type?", async (req, res) => {
  try {
    const { videoId, type } = req.params;

    // Handle segment requests
    if (type === "seg") {
      const segmentUrl = decodeURIComponent(req.url.split("/seg/")[1]);
      const headers = {
        "User-Agent": getRandomUserAgent(),
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9"
      };

      if (segmentUrl.endsWith(".m3u8")) {
        const r = await fetchWithRetry(segmentUrl, { headers });
        const playlist = await r.text();
        const baseUrl = new URL(segmentUrl).origin + new URL(segmentUrl).pathname.replace(/[^/]+$/, "");
        const workerBase = `${req.protocol}://${req.get("host")}/${videoId}/seg/`;
        const rewrittenPlaylist = playlist.replace(/^(?!#)([^\s]+)$/gm, m => {
          try {
            const abs = m.startsWith("http") ? m : new URL(m, baseUrl).href;
            return workerBase + encodeURIComponent(abs);
          } catch {
            return m;
          }
        });
        res.set("Content-Type", "application/vnd.apple.mpegurl");
        return res.send(rewrittenPlaylist);
      }

      const segRes = await fetchWithRetry(segmentUrl, { headers });
      res.set("Access-Control-Allow-Origin", "*");
      segRes.body.pipe(res);
      return;
    }

    // Fetch YouTube page
    const ytPage = await fetchWithRetry(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": getRandomUserAgent() }
    });
    const ytPageText = await ytPage.text();

    // Extract manifest
    let manifestUrl = null;
    const patterns = [
      /"hlsManifestUrl":"(https:[^"]+\.m3u8)"/,
      /"url":"(https:\/\/[^"]+\/manifest\/hls_[^"]+\/playlist\.m3u8)"/,
      /"hlsManifestUrl":\s*"([^"]+\.m3u8)"/
    ];
    for (const p of patterns) {
      const match = ytPageText.match(p);
      if (match) {
        manifestUrl = match[1].replace(/\\u0026/g, "&");
        break;
      }
    }

    if (!manifestUrl) {
      return res.status(404).send("No stream found");
    }

    // Fetch master playlist
    const masterRes = await fetchWithRetry(manifestUrl, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Referer": "https://www.youtube.com/"
      }
    });
    const masterPlaylist = await masterRes.text();

    // Rewrite URLs
    const workerBase = `${req.protocol}://${req.get("host")}/${videoId}/seg/`;
    const rewrittenPlaylist = masterPlaylist.replace(/(https?:\/\/[^\s"]+)/g, m => workerBase + encodeURIComponent(m));

    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.send(rewrittenPlaylist);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
