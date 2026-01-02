const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html på roden
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// POST endpoint til OpenAI
app.post("/chat", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.json({ reply: "Skriv noget tekst først!" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ reply: "API key mangler på Render!" });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Du er en klog AI-assistent." },
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Noget gik galt med OpenAI" });
  }
});

app.listen(PORT, () => console.log(`Server kører på port ${PORT}`));

