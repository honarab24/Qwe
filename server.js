const express = require('express');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

// Change these for your stream
const MPD_URL = "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cgnl_nba.mpd";
const CLEARKEY = "c5e51f41ceac48709d0bdcd9c13a4d88:20b91609967e472c27040716ef6a8b9a";

app.get('/live.m3u8', (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');

  const ffmpeg = spawn('ffmpeg', [
    '-decryption_key', CLEARKEY,
    '-i', MPD_URL,
    '-c', 'copy',
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_list_size', '10',
    '-hls_flags', 'delete_segments',
    'pipe:1'
  ]);

  ffmpeg.stdout.pipe(res);
  ffmpeg.stderr.on('data', d => console.error(d.toString()));

  req.on('close', () => ffmpeg.kill('SIGKILL'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
