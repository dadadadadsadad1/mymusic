const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = 3001;

// 📁 Carpeta persistente para canciones y portadas
const SONGS_DIR = path.join(os.homedir(), "Descargas", "youtube-mp3");

// Crear carpeta si no existe
if (!fs.existsSync(SONGS_DIR)) {
  fs.mkdirSync(SONGS_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/songs", express.static(SONGS_DIR)); // Servir archivos desde carpeta

// 📥 Descargar canción y portada
app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL no válida" });
  }

  const ffmpegPath = "C:\\Users\\wilia\\Downloads\\ffmpeg\\bin"; // Ajusta si cambia tu ruta
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

// 🎵 Obtener canciones disponibles
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
        audioUrl: `http://localhost:${PORT}/songs/${encodeURIComponent(mp3File)}`,
        imageUrl: imageFile
          ? `http://localhost:${PORT}/songs/${encodeURIComponent(imageFile)}`
          : null,
      };
    });

  console.log("🎵 Canciones disponibles:", songs);
  res.json(songs);
});

// ❌ Eliminar canción y portada
app.delete("/songs/file/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename); // ejemplo: cancion.mp3
  const audioPath = path.join(SONGS_DIR, filename);
  const base = filename.replace(".mp3", "");
  const possibleImage = path.join(SONGS_DIR, base + ".jpg");

  console.log("🗑️ Intentando eliminar:", filename);

  // Eliminar MP3
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
    console.log("✅ Canción eliminada:", filename);
  } else {
    console.warn("⚠️ No se encontró la canción:", filename);
  }

  // Eliminar imagen si existe
  if (fs.existsSync(possibleImage)) {
    fs.unlinkSync(possibleImage);
    console.log("🖼️ Imagen eliminada:", base + ".jpg");
  }

  res.json({ message: "Eliminación completada" });
});

// Servir archivos estáticos del frontend (Vite build)
//app.use(express.static(path.join(__dirname, "dist")));

// Ruta fallback para que React maneje las rutas SPA
//app.get("*", (req, res) => {
  //res.sendFile(path.join(__dirname, "dist", "index.html"));
//});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🎶 Servidor corriendo en http://localhost:${PORT}`);
});
