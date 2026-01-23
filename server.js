import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* -----------------------------
   CHAT
----------------------------- */
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Ingen besked" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Du er Aetherion AI. Klar, faktabaseret og struktureret." },
        { role: "user", content: message }
      ]
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat-fejl" });
  }
});

/* -----------------------------
   IMAGE
----------------------------- */
app.post("/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt mangler" });

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });

    res.json({ b64: result.data[0].b64_json });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Billed-fejl" });
  }
});

/* -----------------------------
   VIDEO (OpenAI → Runway)
----------------------------- */
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt mangler" });

    // 1️⃣ OpenAI laver cinematic video-prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
You create cinematic AI video prompts.
Include camera movement, lighting, mood, realism.
No explanations. Only the prompt.
`
        },
        { role: "user", content: prompt }
      ]
    });

    const videoPrompt = completion.choices[0].message.content;

    // 2️⃣ Start Runway job
    const job = await axios.post(
      "https://api.runwayml.com/v1/generate",
      {
        model: "gen-2",
        prompt: videoPrompt,
        duration: 12,
        ratio: "16:9"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const taskId = job.data.id;

    // 3️⃣ Poll indtil færdig
    let videoUrl = null;

    while (!videoUrl) {
      await new Promise(r => setTimeout(r, 3000));

      const status = await axios.get(
        `https://api.runwayml.com/v1/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`
          }
        }
      );

      if (status.data.status === "completed") {
        videoUrl = status.data.output.video_url;
      }

      if (status.data.status === "failed") {
        throw new Error("Video generation failed");
      }
    }

    res.json({ videoUrl });

  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Video-fejl" });
  }
});

/* -----------------------------
   START
----------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Aetherion AI kører på port ${PORT}`)
);


