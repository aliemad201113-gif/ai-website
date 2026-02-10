import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import fetch from "node-fetch";
import RunwayML from "@runwayml/sdk";

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const runway = new RunwayML({ apiKey: process.env.RUNWAY_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

await fs.mkdir("uploads", { recursive: true });

// ================= CHAT =================
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const lower = message.toLowerCase();

    let reply = "";
    let imageUrl = null;
    let videoUrl = null;

    // ================= RUNWAY IMAGE =================
    if (lower.includes("runway billede")) {

      const task = await runway.textToImage
        .create({
          promptText: message,
          model: "gemini_2.5_flash",
          ratio: "1344:768"
        })
        .waitForTaskOutput();

      imageUrl = task.output?.[0]?.url;
      reply = imageUrl
        ? "🎨 Runway billede:"
        : "❌ Runway kunne ikke lave billede";
    }

    // ================= OPENAI IMAGE =================
    else if (lower.includes("billede")) {

      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt: message,
        size: "1024x1024"
      });

      imageUrl = `data:image/png;base64,${img.data[0].b64_json}`;
      reply = "🎨 Her er dit billede:";
    }

    // ================= RUNWAY VIDEO =================
    else if (lower.includes("video")) {

      if (!PUBLIC_URL) {
        return res.json({
          reply: "❌ PUBLIC_URL mangler i Render env"
        });
      }

      // 1. Lav billede til video start
      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt: "Scene til video: " + message,
        size: "1024x1024"
      });

      const buffer = Buffer.from(img.data[0].b64_json, "base64");

      const filename = `video_${Date.now()}.png`;
      const filepath = path.join("uploads", filename);

      await fs.writeFile(filepath, buffer);

      const publicImage = `${PUBLIC_URL}/uploads/${filename}`;

      console.log("Runway bruger billede:", publicImage);

      // 2. Start Runway Gen-3 video job
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
              image_url: publicImage
            }
          })
        }
      );

      const startData = await runwayStart.json();
      console.log("RUNWAY START:", startData);

      if (!startData.id) {
        return res.json({
          reply: "❌ Runway kunne ikke starte video"
        });
      }

      // 3. Poll status
      let attempts = 0;
      const max = 25;

      while (attempts < max) {

        attempts++;
        await new Promise(r => setTimeout(r, 5000));

        const statusRes = await fetch(
          `https://api.runwayml.com/v1/jobs/${startData.id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`
            }
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

    res.json({ reply, imageUrl, videoUrl });

  } catch (err) {
    console.error(err);
    res.json({ reply: "⚠️ Server fejl" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server kører");
});
