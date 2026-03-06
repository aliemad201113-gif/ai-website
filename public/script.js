const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");

function addMessage(text, sender) {

const div = document.createElement("div");

div.className = sender;

div.innerHTML = text;

chat.appendChild(div);

chat.scrollTop = chat.scrollHeight;

}


sendBtn.onclick = async () => {

const message = input.value;

if(!message) return;

addMessage(message,"user");

const formData = new FormData();

formData.append("message",message);

if(fileInput.files[0]){
formData.append("image",fileInput.files[0]);
}

const res = await fetch("/chat",{

method:"POST",

body:formData

});

const data = await res.json();

addMessage(data.reply,"ai");


// ===== IMAGE =====

if(data.imageUrl){

const img = document.createElement("img");

img.src = data.imageUrl;

img.style.width="300px";

chat.appendChild(img);

}


// ===== VIDEO =====

if(data.videoTaskId){

addMessage("🎬 Genererer video...","ai");

checkVideo(data.videoTaskId);

}

input.value="";

};


async function checkVideo(id){

const interval = setInterval(async ()=>{

const res = await fetch(`/video-status/${id}`);

const data = await res.json();

if(data.status === "SUCCEEDED"){

clearInterval(interval);

const video = document.createElement("video");

video.src = data.output[0];

video.controls = true;

video.autoplay = true;

video.width = 400;

chat.appendChild(video);

}

},4000);

}