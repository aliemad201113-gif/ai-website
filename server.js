import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import fetch from "node-fetch";
import RunwayML from "@runwayml/sdk";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const runway = new RunwayML({ apiKey: process.env.RUNWAY_API_KEY });

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

await fs.mkdir("uploads", { recursive: true });

// ================= CHAT + BILLEDE + VIDEO =================
app.post("/chat", upload.single("image"), async (req, res) => {
  try {
    const message = req.body.message || "";
    const file = req.file;

    let reply = "";
    let imageUrl = null;
    let videoUrl = null;

    // ================= HANDLE IMAGE UPLOAD =================
    let uploadedImageUrl = null;
    if (file) {
      uploadedImageUrl = `${PUBLIC_URL}/uploads/${file.filename}`;
      console.log("Uploaded billede:", uploadedImageUrl);
    }

    // ================= RUNWAY VIDEO =================
    if (message.toLowerCase().includes("video")) {
      if (!uploadedImageUrl) {
        return res.json({ reply: "❌ Upload et billede for at lave video" });
      }

      // Start Runway Gen-3 video job
      const runwayStart = await fetch(
        "https://api.runwayml.com/v1/jobs",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
            "Content-Type": "application/json",
            "X-Runway-Version": "2024-11-06"
          },
          body: JSON.stringify({
            model: "gen-3-alpha",
            input: {
              prompt: message,
              image_url: uploadedImageUrl
            }
          })
        }
      );

      const startData = await runwayStart.json();
      console.log("RUNWAY START:", startData);

      if (!startData.id) {
        return res.json({ reply: "❌ Runway kunne ikke starte video" });
      }

      // Poll status
      let attempts = 0;
      const max = 25;
      while (attempts < max) {
        attempts++;
        await new Promise(r => setTimeout(r, 5000));

        const statusRes = await fetch(
          `https://api.runwayml.com/v1/jobs/${startData.id}`,
          {
            headers: { Authorization: `Bearer ${process.env.RUNWAY_API_KEY}` }
          }
        );

        const status = await statusRes.json();
        console.log("RUNWAY STATUS:", status.status);

        if (status.status === "SUCCEEDED") {
          const output = status.output?.[0];
          videoUrl =
            status.output?.video_url ||
            output?.url ||
            output?.files?.find(f => f.type === "video/mp4")?.url;

          reply = videoUrl
            ? "🎬 Her er din video:"
            : "❌ Video genereret men ingen fil fundet";
          break;
        }

        if (status.status === "FAILED") {
          reply = "❌ Video generation fejlede";
          break;
        }
      }

      if (!videoUrl && reply === "") {
        reply = "⏱️ Video tog for lang tid";
      }
    }
    // ================= OPENAI BILLEDE =================
    else if (message.toLowerCase().includes("billede")) {
      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt: message,
        size: "1024x1024"
      });
      imageUrl = `data:image/png;base64,${img.data[0].b64_json}`;
      reply = "🎨 Her er dit billede:";
    }
    // ================= CHAT =================
    else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du er en venlig AI." },
          { role: "user", content: message }
        ]
      });
      reply = completion.choices[0].message.content;
    }

    res.json({ reply, imageUrl, videoUrl, uploadedImageUrl });
  } catch (err) {
    console.error(err);
    res.json({ reply: "⚠️ Server fejl" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server kører på port ${PORT}`);
});
