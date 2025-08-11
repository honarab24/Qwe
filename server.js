const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// DASH + ClearKey info
const MPD_URL = "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cgnl_nba.mpd";
const CLEARKEY = "c5e51f41ceac48709d0bdcd9c13a4d88:20b91609967e472c27040716ef6a8b9a";

// Live HLS output endpoint
app.get('/live.m3u8', (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');

  const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'error',

    // Retry/reconnect settings
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '2',

    // Input & key
    '-decryption_key', CLEARKEY,
    '-i', MPD_URL,

    // Fast start settings
    '-fflags', '+genpts+discardcorrupt',
    '-analyzeduration', '100000',
    '-probesize', '1000000',

    // Copy streams without re-encoding
    '-c', 'copy',

    // HLS output tweaks
    '-f', 'hls',
    '-hls_time', '3',
    '-hls_list_size', '5',
    '-hls_flags', 'delete_segments+program_date_time',

    'pipe:1'
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', (d) => {
    console.error('FFmpeg:', d.toString());
  });

  req.on('close', () => {
    ffmpeg.kill('SIGKILL');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/live.m3u8`);
});
