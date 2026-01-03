// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // frontend i public/

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -----------------------------
   AI CHAT ENDPOINT
----------------------------- */
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: "Ingen besked sendt" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Du er Aetherion AI. Altid faktabaseret, svar klart og struktureret." },
        { role: "user", content: userMessage }
      ]
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI fejl" });
  }
});

/* -----------------------------
   AI IMAGE GENERATION ENDPOINT
----------------------------- */
app.post("/generate-image", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: "Prompt mangler" });

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });

    if (!result.data || !result.data[0].b64_json) {
      return res.status(500).json({ error: "Ingen billeddata returneret" });
    }

    // Returner Base64
    res.json({ b64_json: result.data[0].b64_json });

  } catch (err) {
    console.error(err);
    if (err.status === 403) {
      res.status(403).json({ error: "Billedgenerator virker ikke – kontoen skal være verified på OpenAI." });
    } else {
      res.status(500).json({ error: "Fejl ved billedgenerering" });
    }
  }
});

/* -----------------------------
   START SERVER
----------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Aetherion AI kører på port", PORT));

