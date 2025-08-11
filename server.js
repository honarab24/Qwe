const express = require("express");
const cors = require("cors");
const compression = require("compression");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(compression());

const PORT = process.env.PORT || 10000;

const MPD_URL = "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cgnl_nba.mpd";
const CLEARKEY = "c5e51f41ceac48709d0bdcd9c13a4d88:20b91609967e472c27040716ef6a8b9a";

app.get("/live.m3u8", (req, res) => {
  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-reconnect", "1",
    "-reconnect_streamed", "1",
    "-reconnect_delay_max", "2",
    "-decryption_key", CLEARKEY,
    "-i", MPD_URL,
    "-fflags", "+genpts+discardcorrupt",
    "-analyzeduration", "100000",
    "-probesize", "1000000",
    "-c", "copy",
    "-f", "hls",
    "-hls_time", "3",
    "-hls_list_size", "5",
    "-hls_flags", "delete_segments+program_date_time",
    "pipe:1"
  ];

  const ffmpeg = spawn("ffmpeg", args);

  ffmpeg.stdout.pipe(res);
  ffmpeg.stderr.on("data", (d) => console.error(d.toString()));

  req.on("close", () => ffmpeg.kill("SIGKILL"));
});

app.listen(PORT, () => console.log(`🚀 Live at http://localhost:${PORT}/live.m3u8`));
