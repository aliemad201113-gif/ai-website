const chatWindow = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const fileInput = document.getElementById("fileInput");
const sendBtn = document.getElementById("sendBtn");
const generateBtn = document.getElementById("generateBtn");

sendBtn.addEventListener("click", sendMessage);
generateBtn.addEventListener("click", generateImage);

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ================= SEND MESSAGE =================
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

  try {
    const res = await fetch("/chat", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    removeLoading();
    appendAIResponse(data);

  } catch (err) {
    removeLoading();
    appendAIMessage("⚠️ Server fejl");
  }
}

// ================= GENERATE IMAGE =================
async function generateImage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendUserMessage(message);
  userInput.value = "";

  showLoading();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "billede: " + message })
    });

    const data = await res.json();
    removeLoading();
    appendAIResponse(data);

  } catch (err) {
    removeLoading();
    appendAIMessage("⚠️ Billedfejl");
  }
}

// ================= UI HELPERS =================
function appendUserMessage(text) {
  chatWindow.innerHTML += `<div class="user-message">🧑 ${text}</div>`;
  scrollDown();
}

function appendAIMessage(text) {
  chatWindow.innerHTML += `<div class="ai-message">🤖 ${text}</div>`;
  scrollDown();
}

function appendAIResponse(data) {
  let html = `<div class="ai-message">🤖 ${data.reply}</div>`;

  if (data.uploadedImageUrl) {
    html += `<div class="ai-message"><img src="${data.uploadedImageUrl}" width="300"></div>`;
  }

  if (data.imageUrl) {
    html += `<div class="ai-message"><img src="${data.imageUrl}" width="300"></div>`;
  }

  if (data.videoUrl) {
    html += `
      <div class="ai-message">
        <video controls width="300">
          <source src="${data.videoUrl}" type="video/mp4">
        </video>
      </div>
    `;
  }

  chatWindow.innerHTML += html;
  scrollDown();
}

function showLoading() {
  chatWindow.innerHTML += `<div id="loading" class="ai-message">⏳ Tænker...</div>`;
  scrollDown();
}

function removeLoading() {
  const loading = document.getElementById("loading");
  if (loading) loading.remove();
}

function scrollDown() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}