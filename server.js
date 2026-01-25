// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const OpenAI = require("openai");
const multer = require("multer");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Multer setup til uploads
const upload = multer({ dest: "uploads/" });

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔑 Tjek at keys er loaded
console.log("Runway API key loaded:", !!process.env.RUNWAY_API_KEY);
console.log("OpenAI API key loaded:", !!process.env.OPENAI_API_KEY);

// ------------------------------
// /ask route
// ------------------------------
app.post("/ask", upload.single("image"), async (req, res) => {
  const prompt = req.body.prompt;
  const file = req.file;

  if (!prompt) return res.status(400).json({ error: "Prompt mangler" });

  console.log("Prompt:", prompt);
  if (file) console.log("Referencebillede modtaget:", file.path);

  try {
    const p = prompt.toLowerCase();

    // ---------- IMAGE ----------
    if (p.includes("billede") || p.includes("image")) {
      const result = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });

      return res.json({ type: "image", url: result.data[0].url });
    }

    // ---------- VIDEO ----------
    if (p.includes("video")) {
      // 1️⃣ Lav cinematic prompt med OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You create cinematic AI video prompts. Include camera movement, lighting, mood, realism. Only output the prompt.",
          },
          { role: "user", content: prompt },
        ],
      });

      const videoPrompt = completion.choices[0].message.content;

      // 2️⃣ Send til Runway med referencebillede (valgfrit)
      const refImageBase64 = file
        ? fs.readFileSync(file.path, { encoding: "base64" })
        : undefined;

      const job = await axios.post(
        "https://api.dev.runwayml.com/v1/tasks", // ✅ Rigtigt endpoint
        {
          model: "gen-2",
          prompt: videoPrompt,
          duration: 12,
          ratio: "16:9",
          reference_image: refImageBase64,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({
        type: "video",
        message: "Video job startet",
        jobId: job.data.id,
      });
    }

    // ---------- CHAT ----------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Du er Aetherion AI. Klar og faktabaseret." },
        { role: "user", content: prompt },
      ],
    });

    return res.json({
      type: "chat",
      reply: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("❌ /ask-fejl:", err.response?.data || err.message || err);
    res.status(500).json({ error: err.response?.data || err.message || "AI-fejl" });
  }
});

// ------------------------------
// Poll video status
// ------------------------------
app.get("/video-status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await axios.get(
      `https://api.dev.runwayml.com/v1/tasks/${jobId}`, // ✅ Rigtigt endpoint
      { headers: { Authorization: `Bearer ${process.env.RUNWAY_API_KEY}` } }
    );

    if (status.data.status === "completed") {
      return res.json({ ready: true, videoUrl: status.data.output.video_url });
    } else if (status.data.status === "failed") {
      return res.json({ ready: false, failed: true });
    }

    return res.json({ ready: false });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Video-status-fejl" });
  }
});

// ------------------------------
// Start server
// ------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Aetherion AI kører på port ${PORT}`);
});
