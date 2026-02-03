import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static("public"));

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// Multer upload folder
const upload = multer({ dest: "uploads/" });

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test route
app.get("/ping", (req, res) => res.send("Server virker 👍"));

// AI endpoint
app.post("/ask", upload.single("image"), async (req, res) => {
  const file = req.file;
  const prompt = req.body.prompt || "Beskriv billedet";

  try {
    const content = [{ type: "input_text", text: prompt }];

    if (file) {
      // Send billede som markdown link
      const imageUrl = `http://localhost:${PORT}/uploads/${file.filename}`;
      content.push({
        type: "input_text",
        text: `![billede](${imageUrl})`
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content }]
    });

    const reply = response.output
      .flatMap(o => o.content)
      .filter(c => c.type === "output_text")
      .map(c => c.text)
      .join("");

    res.json({ reply: reply || "Ingen svar" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server fejl" });

  } finally {
    if (file) await fs.unlink(file.path).catch(() => {});
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server kører på http://localhost:${PORT}`);
});


