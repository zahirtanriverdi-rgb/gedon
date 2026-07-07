import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// ESM üçün __dirname təyini
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

// Middleware tənzimləmələri
app.use(cors());
app.use(express.json());

// API Marşrutları (Bura öz mövcud API kodlarını əlavə edə bilərsən)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running smoothly" });
});

// FRONTEND-İN RENDER VƏ DEVLOPMENT MÜHİTLƏRİNƏ UYĞUNLAŞDIRILMASI
if (isProd) {
  // Production (Render) Rejimi
  // Yığılmış statik faylların (JS, CSS, Şəkillər) yerləşdiyi qovluğu təyin edirik
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));

  // Hər bir səhifə sorğusuna qarşılıq dist/index.html faylını göndəririk (SPA routing üçün)
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
} else {
  // Development (Lokal) Rejimi
  // Lokalda Vite dev-serverinin Express ilə inteqrasiyalı işləməsi üçün middleware quraşdırılır
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(vite.middlewares);
}

// Serverin işə salınması
app.listen(PORT, () => {
  console.log(`Server [${isProd ? "PRODUCTION" : "DEVELOPMENT"}] rejimində start götürdü: http://localhost:${PORT}`);
});
