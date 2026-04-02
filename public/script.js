const chat = document.getElementById("chat");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");

// ===== LOGIN =====
async function login() {
  const email = prompt("Email:");
  const password = prompt("Password:");

  const res = await fetch("/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    alert("Logget ind ✅");
  } else {
    alert(data.error);
  }
}

// ===== REGISTER =====
async function register() {
  const email = prompt("Email:");
  const password = prompt("Password:");

  const res = await fetch("/register", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  alert(data.message || data.error);
}

// ===== UI =====
function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = type;
  div.innerHTML = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// ===== SEND =====
sendBtn.onclick = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Log ind først");
    return;
  }

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
    headers: {
      Authorization: "Bearer " + token
    },
    body: formData
  });

  const data = await res.json();

  addMessage("🤖 " + data.reply, "ai");

  // IMAGE
  if (data.imageUrl) {
    const img = document.createElement("img");
    img.src = data.imageUrl;
    img.width = 300;
    chat.appendChild(img);
  }

  // VIDEO
  if (data.videoTaskId) {
    pollVideo(data.videoTaskId);
  }

  input.value = "";
};

// ===== VIDEO POLLING =====
function pollVideo(taskId) {
  const token = localStorage.getItem("token");

  const interval = setInterval(async () => {
    const res = await fetch(`/video-status/${taskId}`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const task = await res.json();

    if (task.status === "SUCCEEDED") {
      clearInterval(interval);

      const url =
        task.output?.assets?.[0]?.url ||
        task.output?.[0];

      const video = document.createElement("video");
      video.src = url;
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