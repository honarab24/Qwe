const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Default OTT Navigator User-Agent
const DEFAULT_UA = 'OTT Navigator/1.7.2.2 (Linux;Android 13; en; 1t68q56)';

// Enable CORS
app.use(cors());

// Home page
app.get('/', (req, res) => {
  res.send(`
    <h2>OTT Navigator M3U Extractor & Proxy</h2>
    <form action="/extract" method="get">
      <input type="text" name="url" placeholder="Enter playlist URL" style="width:400px;"><br><br>
      <input type="text" name="ua" placeholder="User-Agent (optional)" style="width:400px;"><br><br>
      <button type="submit">Extract</button>
    </form>
  `);
});

// Extract playlist (M3U/M3U8)
app.get('/extract', async (req, res) => {
  const targetUrl = req.query.url;
  const ua = req.query.ua || DEFAULT_UA;

  if (!targetUrl) {
    return res.status(400).send('Error: No URL provided');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': ua,
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Icy-MetaData': '1'
      },
      redirect: 'follow',
      timeout: 20000
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();

    // Proxy stream URLs so playback works
    const proxiedText = text.replace(
      /(https?:\/\/[^\s]+)/g,
      (url) =>
        `${req.protocol}://${req.get('host')}/proxy?url=${encodeURIComponent(
          url
        )}&ua=${encodeURIComponent(ua)}`
    );

    res.type('text/plain').send(proxiedText);
  } catch (err) {
    res.status(500).send(`Failed to fetch: ${err.message}`);
  }
});

// Proxy for stream URLs (.ts, .m3u8, etc.)
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  const ua = req.query.ua || DEFAULT_UA;

  if (!targetUrl) {
    return res.status(400).send('Error: No stream URL provided');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': ua,
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      redirect: 'follow',
      timeout: 20000
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    res.set(
      'Content-Type',
      response.headers.get('content-type') || 'application/octet-stream'
    );
    response.body.pipe(res);
  } catch (err) {
    res.status(500).send(`Stream proxy failed: ${err.message}`);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ OTT Navigator-style extractor running on port ${PORT}`);
});
