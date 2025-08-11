'use strict';

const express = require('express');
const got = require('got');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const PROXY_KEY = process.env.PROXY_KEY || 'changeme'; // set this in env to lock proxy

app.use(helmet());
app.use(cors({
  origin: true
}));
app.use(express.json());

// Simple health
app.get('/ping', (req, res) => res.send('ok'));

// Fetch a remote M3U and return it, using User-Agent: "OTT NAVIGATOR"
// Example: GET /fetch-m3u?url=https://example.com/playlist.m3u&key=SECRET
app.get('/fetch-m3u', async (req, res) => {
  try {
    const key = req.query.key || '';
    if (!key || key !== PROXY_KEY) {
      return res.status(401).json({ error: 'invalid key' });
    }

    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'missing url param' });

    // Basic check: only allow http(s)
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'invalid url' });

    // Fetch with got and custom UA
    const response = await got(url, {
      headers: {
        'User-Agent': 'OTT NAVIGATOR'
      },
      timeout: { request: 20000 },
      retry: { limit: 1 }
    });

    // Return as plain text
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(response.body);
  } catch (err) {
    console.error('fetch-m3u error', err?.message || err);
    // If upstream returned non-2xx, try to send status and message
    if (err.response) {
      res.status(err.response.status || 502).send(err.response.body || err.message);
    } else {
      res.status(500).json({ error: err.message || 'unknown error' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`M3U proxy listening on http://localhost:${PORT}`);
  console.log('Ensure you set PROXY_KEY env var to secure the endpoint (export PROXY_KEY=yourkey)');
});
