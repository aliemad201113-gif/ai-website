const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Tillad requests fra alle domæner i første omgang (for debugging)
app.use(cors()); // Du kan ændre til Shopify-domæne senere
app.use(express.json());

// Serve statiske filer fra public
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html på roden
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Chat-historik
let chatHistory = [
  {
    role: "system",
    content: "Du er en klog og hjælpsom AI-assistent, der svarer grundigt og præcist på alle spørgsmål."
  }
];

// POST endpoint til OpenAI
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;
    chatHistory.push({ role: "user", content: message });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: chatHistory
    });

    const reply = completion.choices[0].message.content;
    chatHistory.push({ role: "assistant", content: reply });

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Noget gik galt med OpenAI" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server kører på port ${PORT}`);
});

