import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs/promises";
import helmet from "helmet";
import compression from "compression";
import OpenAI from "openai";
import RunwayML from "@runwayml/sdk";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { fileURLToPath } from "url";
import fsSync from "fs";

const app = express();
const PORT = process.env.PORT || 10000;

// ===== Fix for uploads folder på Render =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!fsSync.existsSync("uploads")) {
  fsSync.mkdirSync("uploads");
}

// ===== Middleware =====
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

// ===== Clients =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const runway = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ===== Upload helper =====
async function uploadToCloudinary(localPath) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder: "lego-ai"
  });

  await fs.unlink(localPath);
  return result.secure_url;
}

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 Server kører på Render");
});

// ================= CHAT ROUTE =================
app.post("/chat", upload.single("image"), async (req, res) => {
  try {
    const message = req.body.message || "";
    const file = req.file;

    let reply = "";
    let imageUrl = null;
    let videoTaskId = null;
    let uploadedImageUrl = null;

    if (file) {
      uploadedImageUrl = await uploadToCloudinary(file.path);
    }

    const lower = message.toLowerCase();

    // ================= VIDEO =================
    if (lower.includes("video")) {
      if (!uploadedImageUrl) {
        return res.json({ reply: "❌ Upload et billede først." });
      }

      const task = await runway.imageToVideo.create({
        model: "veo3.1",
        promptText: message,
        promptImage: [
          {
            uri: uploadedImageUrl,
            position: "first"
          }
        ],
        ratio: "1280:720",
        duration: 4
      });

      videoTaskId = task.id;

      return res.json({
        reply: "🎬 Video genereres...",
        videoTaskId
      });
    }

    // ================= IMAGE =================
    else if (lower.includes("billede")) {
      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt: message,
        size: "1024x1024"
      });

      imageUrl = `data:image/png;base64,${img.data[0].b64_json}`;
      reply = "🎨 Her er dit billede:";
    }

    // ================= CHAT =================
    else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du er en venlig AI." },
          { role: "user", content: message }
        ]
      });

      reply = completion.choices[0].message.content;
    }

    res.json({
      reply,
      imageUrl,
      uploadedImageUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply: "⚠️ Server fejl"
    });
  }
});

// ================= VIDEO STATUS ROUTE (POLLING) =================
app.get("/video-status/:id", async (req, res) => {
  try {
    const task = await runway.tasks.retrieve(req.params.id);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Kunne ikke hente video status" });
  }
});

// ================= START SERVER =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server kører på port ${PORT}`);
});