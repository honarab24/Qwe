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
      <input type="text" name="url" placeholder="Enter playlist URL" style="width:400px;"><br><br>
      <input type="text" name="ua" placeholder="User-Agent (optional)" style="width:400px;"><br><br>
      <button type="submit">Extract</button>
    </form>
  `);
});

// Extract route
app.get('/extract', async (req, res) => {
  const targetUrl = req.query.url;
  const customUA = req.query.ua;

  if (!targetUrl) {
    return res.status(400).send('Error: No URL provided');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': customUA || 'OTT Navigator/1.7.2.2 (Linux;Android 13; en; 1t68q56)',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Icy-MetaData': '1'
      },
      redirect: 'follow',
      timeout: 15000
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
  console.log(`✅ OTT Navigator-style M3U Extractor running on port ${PORT}`);
});
