// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Frontend i public/

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -----------------------------
   LIVE WEB SEARCH (TAVILY)
----------------------------- */
async function webSearch(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        search_depth: "advanced",
        max_results: 5,
        include_answer: true
      })
    });
    const data = await response.json();
    return data.answer || "Ingen aktuelle resultater fundet.";
  } catch {
    return "Fejl ved web-søgning.";
  }
}

/* -----------------------------
   AI CHAT ENDPOINT
----------------------------- */
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const liveInfo = await webSearch(userMessage);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
Du er Aetherion AI (2026).

REGLER:
- Ekstremt intelligent og faktabaseret
- ALDRIG gætte
- Brug LIVE web-data hvis relevant
- Hvis info mangler, sig det
- Svar klart, struktureret og professionelt
`
        },
        {
          role: "system",
          content: `LIVE WEB-DATA:\n${liveInfo}`
        },
        {
          role: "user",
          content: userMessage
        }
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

    res.json({ imageUrl: result.data[0].url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fejl ved billedgenerering" });
  }
});

/* -----------------------------
   START SERVER (Render klar)
----------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Aetherion AI kører på port", PORT));


