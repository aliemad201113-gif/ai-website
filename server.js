import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs/promises";
import fsSync from "fs";
import OpenAI from "openai";
import RunwayML from "@runwayml/sdk";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===== RENDER FIX (tmp folder) =====
const uploadDir = "/tmp/uploads";

if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

// ===== JSON DATABASE =====
const DB_FILE = "/tmp/users.json";

let users = [];

if (fsSync.existsSync(DB_FILE)) {
  users = JSON.parse(fsSync.readFileSync(DB_FILE));
}

async function saveUsers() {
  await fs.writeFile(DB_FILE, JSON.stringify(users, null, 2));
}

// ===== API CLIENTS =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const runway = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY
});

// ===== AUTH =====
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "Ikke logget ind" });
  }

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Ugyldig token" });
  }
}

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ error: "Manglende info" });
  }

  if (users.find(u => u.email === email)) {
    return res.json({ error: "Bruger findes allerede" });
  }

  const hashed = await bcrypt.hash(password, 10);

  users.push({ email, password: hashed });
  await saveUsers();

  res.json({ message: "Bruger oprettet ✅" });
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.json({ error: "Forkert login" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ error: "Forkert login" });

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// ===== CHAT =====
app.post("/chat", auth, upload.single("image"), async (req, res) => {
  try {
    const message = req.body.message || "";
    const file = req.file;
    const lower = message.toLowerCase();

    // ===== VIDEO =====
    if (
      lower.includes("video") ||
      lower.includes("animation") ||
      lower.includes("film")
    ) {
      if (!file) {
        return res.json({ reply: "📸 Upload et billede først" });
      }

      const base64 = await fs.readFile(file.path, "base64");

      const task = await runway.imageToVideo.create({
        model: "gen3a_turbo",
        promptText: `${message}. cinematic, smooth motion, high quality`,
        promptImage: `data:${file.mimetype};base64,${base64}`,
        duration: 5
      });

      await fs.unlink(file.path);

      return res.json({
        reply: "🎬 Video genereres...",
        videoTaskId: task.id
      });
    }

    // ===== IMAGE =====
    if (lower.includes("billede")) {
      const img = await openai.images.generate({
        model: "gpt-image-1",
        prompt: message,
        size: "1024x1024"
      });

      return res.json({
        reply: "🎨 Her er dit billede",
        imageUrl: `data:image/png;base64,${img.data[0].b64_json}`
      });
    }

    // ===== CHAT =====
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Du er en venlig AI assistent." },
        { role: "user", content: message }
      ]
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "⚠️ Server fejl" });
  }
});

// ===== VIDEO STATUS =====
app.get("/video-status/:id", auth, async (req, res) => {
  try {
    const task = await runway.tasks.retrieve(req.params.id);
    res.json(task);
  } catch {
    res.status(500).json({ error: "Kunne ikke hente video status" });
  }
});

// ===== SERVER =====
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Kører på port", PORT);
});