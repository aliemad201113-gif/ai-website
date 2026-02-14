// Hent DOM-elementer
const chatWindow = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const fileInput = document.getElementById("fileInput");
const sendBtn = document.getElementById("sendBtn");
const generateBtn = document.getElementById("generateBtn");

// Send besked på klik eller Enter
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Generer billede
generateBtn.addEventListener("click", generateImage);

// =================== Hovedfunktioner ===================

async function sendMessage() {
  const message = userInput.value.trim();
  const file = fileInput.files[0];
  if (!message && !file) return;

  // Vis brugerbesked
  chatWindow.innerHTML += `<div class="user-message">🧑 ${message || "📷 billede"}</div>`;
  userInput.value = "";
  fileInput.value = "";

  const formData = new FormData();
  formData.append("message", message);
  if (file) formData.append("image", file);

  try {
    const res = await fetch("/chat", { method: "POST", body: formData });
    const data = await res.json();

    let aiHtml = `<div class="ai-message">🤖 ${data.reply}</div>`;

    if (data.uploadedImageUrl) {
      aiHtml += `<div class="ai-message"><img src="${data.uploadedImageUrl}" width="300"></div>`;
    }

    if (data.imageUrl) {
      aiHtml += `<div class="ai-message"><img src="${data.imageUrl}" width="300"></div>`;
    }

    if (data.videoUrl) {
      aiHtml += `<div class="ai-message">
        <video controls width="300">
          <source src="${data.videoUrl}" type="video/mp4">
        </video>
      </div>`;
    }

    chatWindow.innerHTML += aiHtml;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    console.error(err);
    chatWindow.innerHTML += `<div class="ai-message">⚠️ Fejl ved serverkommunikation</div>`;
  }
}

// =================== Generer billede-knap ===================
async function generateImage() {
  const message = userInput.value.trim();
  if (!message) return;

  chatWindow.innerHTML += `<div class="user-message">🧑 ${message}</div>`;
  userInput.value = "";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "billede: " + message })
    });
    const data = await res.json();

    let aiHtml = `<div class="ai-message">🤖 ${data.reply}</div>`;

    if (data.imageUrl) {
      aiHtml += `<div class="ai-message"><img src="${data.imageUrl}" width="300"></div>`;
    }

    chatWindow.innerHTML += aiHtml;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    console.error(err);
    chatWindow.innerHTML += `<div class="ai-message">⚠️ Fejl ved billedgenerering</div>`;
  }
}
