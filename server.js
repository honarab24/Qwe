// Fully Optimized OTT Navigator M3U Extractor
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for browser use
app.use(cors());

// Home page
app.get('/', (req, res) => {
  res.send(`
    <h2>OTT Navigator M3U Extractor</h2>
    <form action="/extract" method="get">
      <input type="text" name="url" placeholder="Enter playlist URL" style="width:400px;">
      <button type="submit">Extract</button>
    </form>
  `);
});

// Extract route
app.get('/extract', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Error: No URL provided');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'OTT Navigator/1.7.3.1 (Linux;Android 13; 1jnb5cf)'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    res.type('text/plain').send(text);

  } catch (err) {
    res.status(500).send(`Failed to fetch: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ M3U Extractor running on port ${PORT}`);
});
