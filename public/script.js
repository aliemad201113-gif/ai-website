const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");

function addMessage(text, type) {

  const div = document.createElement("div");
  div.className = type;
  div.innerHTML = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// ===== SEND MESSAGE =====
sendBtn.onclick = async () => {

  const message = input.value.trim();
  if (!message && !fileInput.files[0]) return;

  addMessage("🧑 " + message, "user");

  const formData = new FormData();
  formData.append("message", message);

  if (fileInput.files[0]) {
    formData.append("image", fileInput.files[0]);
  }

  const res = await fetch("/chat", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  addMessage("🤖 " + data.reply, "ai");

  // ===== IMAGE =====
  if (data.imageUrl) {

    const img = document.createElement("img");
    img.src = data.imageUrl;
    img.width = 300;

    chat.appendChild(img);
  }

  // ===== VIDEO =====
  if (data.videoTaskId) {

    addMessage("🎬 Genererer video...", "ai");

    pollVideo(data.videoTaskId);
  }

  input.value = "";
};

// ===== VIDEO POLLING =====
async function pollVideo(taskId) {

  const interval = setInterval(async () => {

    const res = await fetch(`/video-status/${taskId}`);
    const task = await res.json();

    if (task.status === "SUCCEEDED") {

      clearInterval(interval);

      const videoUrl =
        task.output?.assets?.[0]?.url ||
        task.output?.[0];

      const video = document.createElement("video");

      video.src = videoUrl;
      video.controls = true;
      video.width = 400;

      chat.appendChild(video);
    }

    if (task.status === "FAILED") {

      clearInterval(interval);
      addMessage("❌ Video fejlede", "ai");
    }

  }, 5000);
}