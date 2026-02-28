const chatWindow = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const fileInput = document.getElementById("fileInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ================= SEND =================
async function sendMessage() {
  const message = userInput.value.trim();
  const file = fileInput.files[0];

  if (!message && !file) return;

  appendUserMessage(message || "📷 billede");

  const formData = new FormData();
  formData.append("message", message);
  if (file) formData.append("image", file);

  userInput.value = "";
  fileInput.value = "";

  showLoading();

  const res = await fetch("/chat", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  removeLoading();

  appendAIResponse(data);

  // Hvis video task starter → start polling
  if (data.videoTaskId) {
    pollVideo(data.videoTaskId);
  }
}

// ================= VIDEO POLLING =================
async function pollVideo(taskId) {
  const interval = setInterval(async () => {
    const res = await fetch(`/video-status/${taskId}`);
    const task = await res.json();

    if (task.status === "SUCCEEDED") {
      clearInterval(interval);

      const videoUrl =
        task.output?.assets?.[0]?.url ||
        task.output?.[0]?.url;

      appendVideo(videoUrl);
    }

    if (task.status === "FAILED") {
      clearInterval(interval);
      appendAIMessage("❌ Video fejlede");
    }
  }, 5000);
}

// ================= UI =================
function appendUserMessage(text) {
  chatWindow.innerHTML += `<div class="user-message">🧑 ${text}</div>`;
  scrollDown();
}

function appendAIMessage(text) {
  chatWindow.innerHTML += `<div class="ai-message">🤖 ${text}</div>`;
  scrollDown();
}

function appendVideo(url) {
  chatWindow.innerHTML += `
    <div class="ai-message">
      🎬 Video klar:<br>
      <video controls width="300">
        <source src="${url}" type="video/mp4">
      </video>
    </div>
  `;
  scrollDown();
}

function appendAIResponse(data) {
  let html = `<div class="ai-message">🤖 ${data.reply}</div>`;

  if (data.imageUrl) {
    html += `<img src="${data.imageUrl}" width="300">`;
  }

  if (data.uploadedImageUrl) {
    html += `<img src="${data.uploadedImageUrl}" width="300">`;
  }

  chatWindow.innerHTML += html;
  scrollDown();
}

function showLoading() {
  chatWindow.innerHTML += `<div id="loading">⏳ Tænker...</div>`;
}

function removeLoading() {
  const loading = document.getElementById("loading");
  if (loading) loading.remove();
}

function scrollDown() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}