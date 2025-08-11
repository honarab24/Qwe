const express = require("express");
const cors = require("cors");
const compression = require("compression");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(compression());

const PORT = process.env.PORT || 10000;

const MPD_URL = "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cgnl_nba.mpd";
const KEY_ID = "c5e51f41ceac48709d0bdcd9c13a4d88";
const KEY = "20b91609967e472c27040716ef6a8b9a";

app.get("/live.m3u8", (req, res) => {
  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

  const args = [
    `input=${MPD_URL},stream=video,output=video.mp4`,
    `input=${MPD_URL},stream=audio,output=audio.mp4`,
    "--enable_raw_key_decryption",
    `--keys`, `key_id=${KEY_ID}:key=${KEY}`,
    "--hls_master_playlist_output", "pipe:1"
  ];

  const packager = spawn("shaka-packager", args);

  packager.stdout.pipe(res);
  packager.stderr.on("data", (d) => console.error(d.toString()));

  req.on("close", () => packager.kill("SIGKILL"));
});

app.listen(PORT, () => {
  console.log(`🚀 Live at http://localhost:${PORT}/live.m3u8`);
});
