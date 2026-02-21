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

const app = express();
const PORT = process.env.PORT || 3000;

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

// ===== Helper =====
async function uploadToCloudinary(localPath) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder: "lego-ai"
  });

  await fs.unlink(localPath);
  return result.secure_url;
}

// ===== Root =====
app.get("/", (req, res) => {
  res.send("🧱 LEGO AI Server kører 🚀");
});

// ===== Chat Route =====
app.post("/chat", upload.single("image"), async (req, res) => {
  try {
    const message = req.body.message || "";
    const file = req.file;

    let reply = "";
    let imageUrl = null;
    let videoUrl = null;
    let uploadedImageUrl = null;

    // Upload billede hvis findes
    if (file) {
      uploadedImageUrl = await uploadToCloudinary(file.path);
    }

    const lowerMsg = message.toLowerCase();

    // ================= VIDEO =================
    if (lowerMsg.includes("video")) {

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
        duration: 4,
        seed: Math.floor(Math.random() * 1000000000)
      });

      const result = await task.waitForTaskOutput();

      videoUrl =
        result?.output?.video_url ||
        result?.output?.[0]?.url;

      reply = videoUrl
        ? "🎬 Her er din video:"
        : "❌ Video generation fejlede.";
    }

    // ================= IMAGE GENERATION =================
    else if (lowerMsg.includes("billede")) {

      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt: message,
        size: "1024x1024"
      });

      imageUrl = `data:image/png;base64,${img.data[0].b64_json}`;
      reply = "🎨 Her er dit billede:";
    }

    // ================= VISION =================
    else if (uploadedImageUrl) {

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: message },
              {
                type: "image_url",
                image_url: { url: uploadedImageUrl }
              }
            ]
          }
        ]
      });

      reply = completion.choices[0].message.content;
    }

    // ================= NORMAL CHAT =================
    else {

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du er en venlig LEGO AI." },
          { role: "user", content: message }
        ]
      });

      reply = completion.choices[0].message.content;
    }

    res.json({
      reply,
      imageUrl,
      videoUrl,
      uploadedImageUrl
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({
      reply: "⚠️ Server fejl. Tjek Render logs."
    });
  }
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`🚀 Server kører på port ${PORT}`);
});