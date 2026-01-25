import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------
// /ask route
// ---------------------------------
app.post("/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt mangler" });

  const p = prompt.toLowerCase();

  try {
    // ---------- IMAGE ----------
    if (p.includes("billede") || p.includes("image")) {
      const result = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024"
      });

      return res.json({
        type: "image",
        url: result.data[0].url // brug URL i stedet for b64
      });
    }

    // ---------- VIDEO ----------
    if (p.includes("video")) {
      // Midlertidig placeholder / debug
      console.log("⚠️ Video prompt modtaget, men Runway API er midlertidigt deaktiveret");
      return res.json({
        type: "video",
        message: "Video funktion ikke aktiv endnu",
        videoUrl: "https://via.placeholder.com/480x270.png?text=Video+ikke+klar"
      });

      /*  
      // Hvis du vil aktivere Runway igen, kan du bruge dette:
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You create cinematic AI video prompts. Include camera movement, lighting, mood, realism. Only output the prompt."
          },
          { role: "user", content: prompt }
        ]
      });

      const videoPrompt = completion.choices[0].message.content;

      const job = await axios.post(
        "https://api.runwayml.com/v1/tasks",
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

      return res.json({
        type: "video",
        message: "Video job startet",
        jobId: job.data.id
      });
      */
    }

    // ---------- CHAT ----------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Du er Aetherion AI. Klar og faktabaseret." },
        { role: "user", content: prompt }
      ]
    });

    return res.json({
      type: "chat",
      reply: completion.choices[0].message.content
    });

  } catch (err) {
    console.error("❌ /ask-fejl:", err.response?.data || err.message || err);
    res.status(500).json({ error: err.response?.data || err.message || "AI-fejl" });
  }
});

// ---------------------------------
// Start server
// ---------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Aetherion AI kører på port ${PORT}`);
});


