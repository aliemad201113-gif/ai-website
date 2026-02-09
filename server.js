import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Sørg for at uploads folder eksisterer
fs.mkdir("uploads", { recursive: true }).catch(() => {});

// ================= CHAT + AUTO BILLEDE / VIDEO =================
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    let reply = "";
    let imageUrl = null;
    let videoUrl = null;

    // ================= BILLEDE =================
    if (message.toLowerCase().includes("billede")) {
      const image = await openai.images.generate({
        model: "gpt-image-1",
        prompt: message,
        size: "1024x1024"
      });
      const base64 = image.data[0].b64_json;
      imageUrl = `data:image/png;base64,${base64}`;
      reply = "🎨 Her er dit billede:";
    }

    // ================= VIDEO =================
    else if (message.toLowerCase().includes("video")) {
      // 1. Generer midlertidigt billede
      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt: "Et billede der passer til: " + message,
        size: "1024x1024"
      });
      const base64 = img.data[0].b64_json;
      const buffer = Buffer.from(base64, "base64");

      // 2. Gem midlertidigt billede
      const filename = `video_input_${Date.now()}.png`;
      const filepath = path.join("uploads", filename);
      await fs.writeFile(filepath, buffer);
      const imageUrlForRunway = `${PUBLIC_URL}/uploads/${filename}`;

      // 3. Start Runway video job
      const runwayRes = await fetch("https://api.dev.runwayml.com/v1/jobs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-12-17" // ✅ vigtig header
        },
        body: JSON.stringify({
          model: "gen-2",
          input: {
            prompt: message,
            image_url: imageUrlForRunway
          }
        })
      });

      const data = await runwayRes.json();
      console.log("RUNWAY START:", data);

      if (data.id) {
        // Poll status
        let ready = false;
        let attempts = 0;
        const maxAttempts = 20;

        while (!ready && attempts < maxAttempts) {
          attempts++;
          await new Promise(r => setTimeout(r, 5000));

          const statusRes = await fetch(
            `https://api.dev.runwayml.com/v1/jobs/${data.id}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`
              }
            }
          );
          const statusData = await statusRes.json();

          if (statusData.status === "SUCCEEDED") {
            videoUrl = statusData.output?.video_url || statusData.output?.[0]?.url;
            ready = true;
          } else if (statusData.status === "FAILED") {
            reply = "❌ Video fejlede";
            ready = true;
          }
        }

        if (!videoUrl && reply === "") reply = "⏱️ Video tog for lang tid";
        else if (videoUrl) reply = "🎬 Her er din video:";
      } else {
        reply = "❌ Runway startede ikke video-jobbet";
      }
    }

    // ================= TEKST =================
    else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du er en venlig og hjælpsom AI." },
          { role: "user", content: message }
        ]
      });
      reply = completion.choices[0].message.content;
    }

    res.json({ reply, imageUrl, videoUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "⚠️ Noget gik galt" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server kører på ${PUBLIC_URL}`);
});
