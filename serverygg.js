const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const zlib = require('zlib');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/extract', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Error: No URL provided');
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'OTT Navigator/1.7.3.1 (Linux;Android 13; en-US; XYZ)',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'http://localhost/',
        'Origin': 'http://localhost',
        'X-Requested-With': 'com.ottplay.ottnavigator'
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const encoding = response.headers.get('content-encoding');
    let buffer = await response.buffer();

    if (encoding === 'gzip') {
      buffer = zlib.gunzipSync(buffer);
    } else if (encoding === 'deflate') {
      buffer = zlib.inflateSync(buffer);
    } else if (encoding === 'br') {
      buffer = zlib.brotliDecompressSync(buffer);
    }

    res.type('text/plain').send(buffer.toString());

  } catch (err) {
    console.error(`❌ Fetch failed: ${err.message}`);
    res.status(500).send(`Failed to fetch playlist: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ OTT Navigator M3U Extractor running at http://localhost:${PORT}`);
});
