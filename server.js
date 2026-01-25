import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import multer from "multer";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// ES module fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // ⭐⭐⭐ VIGTIG

const upload = multer({ dest: "uploads/" });

// Sanity check
console.log("Runway API key loaded:", !!process.env.RUNWAY_API_KEY);
console.log("OpenAI API key loaded:", !!process.env.OPENAI_API_KEY);

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Runway client
const runway = axios.create({
  baseURL: "https://api.dev.runwayml.com",
  headers: {
    Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
  },
});

// --------------------
// POST /ask
// --------------------
app.post("/ask", upload.single("image"), async (req, res) => {
  try {
    const { prompt } = req.body;
    const file = req.file;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt mangler" });
    }

    // VIDEO
    if (prompt.toLowerCase().includes("video")) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Create a cinematic AI video prompt. Include camera movement, lighting, mood, realism. Only output the prompt.",
          },
          { role: "user", content: prompt },
        ],
      });

      const videoPrompt = completion.choices[0].message.content;

      const referenceImage = file
        ? fs.readFileSync(file.path, { encoding: "base64" })
        : undefined;

      const job = await runway.post("/v1/tasks", {
        model: "gen-2",
        prompt: videoPrompt,
        duration: 8,
        ratio: "16:9",
        reference_image: referenceImage,
      });

      return res.json({
        type: "video",
        jobId: job.data.id,
      });
    }

    // CHAT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Du er Aetherion AI. Klar og faktabaseret." },
        { role: "user", content: prompt },
      ],
    });

    res.json({
      type: "chat",
      reply: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("❌ /ask-fejl:", err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data || err.message || "Serverfejl",
    });
  }
});

// --------------------
// Video status
// --------------------
app.get("/video-status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await runway.get(`/v1/tasks/${jobId}`);

    if (status.data.status === "completed") {
      return res.json({
        ready: true,
        videoUrl: status.data.output?.video_url,
      });
    }

    if (status.data.status === "failed") {
      return res.json({ ready: false, failed: true });
    }

    res.json({ ready: false });
  } catch (err) {
    console.error("❌ video-status-fejl:", err.response?.data || err.message);
    res.status(500).json({ error: "Video-status-fejl" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aetherion AI kører på port ${PORT}`);
});
