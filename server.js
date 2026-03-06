import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs/promises";
import fsSync from "fs";
import OpenAI from "openai";
import RunwayML from "@runwayml/sdk";

const app = express();
const PORT = process.env.PORT || 10000;

// ===== Upload folder fix =====
if (!fsSync.existsSync("uploads")) {
fsSync.mkdirSync("uploads");
}

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===== Clients =====

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

const runway = new RunwayML({
apiKey: process.env.RUNWAY_API_KEY
});


// ================= CHAT =================

app.post("/chat", upload.single("image"), async (req,res)=>{

try{

const message = req.body.message || "";
const file = req.file;

let reply = "";
let imageUrl = null;
let videoTaskId = null;

const lower = message.toLowerCase();


// ================= VIDEO =================

if(lower.includes("video")){

if(!file){
return res.json({reply:"Upload et billede først"});
}

const base64 = await fs.readFile(file.path,{encoding:"base64"});

const task = await runway.imageToVideo.create({

model:"gen3a_turbo",

promptText:message,

promptImage:`data:image/png;base64,${base64}`,

duration:4

});

videoTaskId = task.id;

return res.json({

reply:"🎬 Video genereres...",

videoTaskId

});

}


// ================= IMAGE =================

if(lower.includes("billede") || lower.includes("generate")){

const img = await openai.images.generate({

model:"gpt-image-1",

prompt:message,

size:"1024x1024"

});

imageUrl = `data:image/png;base64,${img.data[0].b64_json}`;

return res.json({

reply:"🎨 Her er dit billede",

imageUrl

});

}


// ================= AI CHAT =================

if(file){

const base64 = await fs.readFile(file.path,{encoding:"base64"});

const completion = await openai.chat.completions.create({

model:"gpt-4o",

messages:[

{
role:"user",
content:[
{type:"text",text:message},
{
type:"image_url",
image_url:{
url:`data:image/png;base64,${base64}`
}
}
]
}

]

});

reply = completion.choices[0].message.content;

}

else{

const completion = await openai.chat.completions.create({

model:"gpt-4o-mini",

messages:[

{role:"system",content:"Du er en venlig AI assistent"},

{role:"user",content:message}

]

});

reply = completion.choices[0].message.content;

}

res.json({reply,imageUrl});

}

catch(err){

console.error(err);

res.status(500).json({reply:"⚠️ Server fejl"});

}

});


// ================= VIDEO STATUS =================

app.get("/video-status/:id",async(req,res)=>{

try{

const task = await runway.tasks.retrieve(req.params.id);

res.json(task);

}

catch(err){

res.status(500).json({error:"Video status fejl"});

}

});


// ================= SERVER =================

app.listen(PORT,()=>{

console.log("🚀 Server kører på port",PORT);

});