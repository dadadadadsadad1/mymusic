const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3001;  // <-- Usa el puerto que venga de la variable de entorno

const SONGS_DIR = path.join(os.homedir(), "Descargas", "youtube-mp3");

if (!fs.existsSync(SONGS_DIR)) {
  fs.mkdirSync(SONGS_DIR, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json());
app.use("/songs", express.static(SONGS_DIR)); 

app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL no válida" });
  }

  const ffmpegPath = "C:\\Users\\wilia\\Downloads\\ffmpeg\\bin";
  const outputTemplate = path.join(SONGS_DIR, "%(title)s.%(ext)s");

  const command = `yt-dlp --write-thumbnail --embed-thumbnail --convert-thumbnail jpg -x --audio-format mp3 --ffmpeg-location "${ffmpegPath}" -o "${outputTemplate}" "${url}"`;

  console.log("🎯 Ejecutando comando:", command);

  exec(command, { shell: true }, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Error al descargar:", err);
      console.error("🧪 STDERR:", stderr);
      return res.status(500).json({ error: "Error al descargar", stderr: stderr.toString() });
    }

    console.log("✅ Descarga y portada completa");
    res.json({ message: "Descarga completa" });
  });
});

app.get("/songs", (req, res) => {
  const files = fs.readdirSync(SONGS_DIR);

  const songs = files
    .filter(f => f.endsWith(".mp3"))
    .map(mp3File => {
      const base = mp3File.replace(".mp3", "");
      const imageFile = files.find(f => f.startsWith(base) && f.endsWith(".jpg"));

      return {
        title: base,
        filename: mp3File,
        audioUrl: `/songs/${encodeURIComponent(mp3File)}`,    // Mejor ruta relativa
        imageUrl: imageFile ? `/songs/${encodeURIComponent(imageFile)}` : null,
      };
    });

  console.log("🎵 Canciones disponibles:", songs);
  res.json(songs);
});

app.delete("/songs/file/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const audioPath = path.join(SONGS_DIR, filename);
  const base = filename.replace(".mp3", "");
  const possibleImage = path.join(SONGS_DIR, base + ".jpg");

  console.log("🗑️ Intentando eliminar:", filename);

  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
    console.log("✅ Canción eliminada:", filename);
  } else {
    console.warn("⚠️ No se encontró la canción:", filename);
  }

  if (fs.existsSync(possibleImage)) {
    fs.unlinkSync(possibleImage);
    console.log("🖼️ Imagen eliminada:", base + ".jpg");
  }

  res.json({ message: "Eliminación completada" });
});

app.listen(PORT, () => {
  console.log(`🎶 Servidor corriendo en http://localhost:${PORT}`);
});

