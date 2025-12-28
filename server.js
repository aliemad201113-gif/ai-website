const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Serve statiske filer
app.use(express.static(__dirname));

// Serve index.html på roden
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Chat-historik for kontekst
let chatHistory = [
  { role: "system", content: "Du er en klog og hjælpsom AI-assistent, der svarer grundigt og præcist på alle spørgsmål." }
];

// POST endpoint til OpenAI
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    // Tilføj brugerens besked til historikken
    chatHistory.push({ role: "user", content: message });

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4", // Brug en stærkere model
      messages: chatHistory
    });

    const reply = completion.choices[0].message.content;

    // Tilføj AI’ens svar til historikken
    chatHistory.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Noget gik galt med OpenAI" });
  }
});

// Start serveren
app.listen(PORT, () => {
  console.log(`Server kører på http://localhost:${PORT}`);
});


