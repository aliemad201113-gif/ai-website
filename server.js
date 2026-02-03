import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import cors from "cors";
import OpenAI from "openai";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔹 Server frontend og uploads offentligt
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// 🔹 Multer setup
const upload = multer({ dest: "uploads/" });

// 🔹 OpenAI klient
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* -------------------- Upload endpoint -------------------- */
// Brugeren uploader et billede, AI kan tilgå det via offentlig URL
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Ingen fil uploadet" });

    // Offentlig URL
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.json({ fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kunne ikke uploade billede" });
  }
});

/* -------------------- AI billedgenerering -------------------- */
app.post("/generate-image", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Manglende prompt" });

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });

    const imageUrl = response.data[0].url;
    res.json({ imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kunne ikke generere billede" });
  }
});

/* -------------------- Start server -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server kører på http://localhost:${PORT}`);
});

