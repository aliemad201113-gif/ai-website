import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* -----------------------------
   LIVE WEB SEARCH (TAVILY)
----------------------------- */
async function webSearch(query) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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
}

/* -----------------------------
   AI CHAT ENDPOINT
----------------------------- */
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // 1️⃣ Hent live web-viden
    const liveInfo = await webSearch(userMessage);

    // 2️⃣ Send til OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
Du er Aetherion AI (2026).

REGLER:
- Du er ekstremt intelligent og faktabaseret
- Du må ALDRIG gætte
- Brug LIVE web-data hvis relevant
- Hvis data er usikker, sig det
- Svar klart, struktureret og professionelt
`
        },
        {
          role: "system",
          content: `LIVE WEB-DATA (2026):\n${liveInfo}`
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI fejl" });
  }
});

/* -----------------------------
   START (Render ready)
----------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Aetherion AI kører på port", PORT);
});
