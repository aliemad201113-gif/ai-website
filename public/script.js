// Hent DOM-elementer
const chatWindow = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Send besked ved klik på knap eller Enter
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Hovedfunktion til at sende besked
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  // Vis brugerbesked i chat
  chatWindow.innerHTML += `<div class="user-message">🧑 ${message}</div>`;
  userInput.value = "";

  // Send til server
  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const data = await res.json();

  // Byg AI-svar
  let aiHtml = `<div class="ai-message">🤖 ${data.reply}</div>`;

  // Hvis der er billede, vis det
  if (data.imageUrl) {
    aiHtml += `<div class="ai-message"><img src="${data.imageUrl}" width="300"></div>`;
  }

  // Hvis der er video, vis det
  if (data.videoUrl) {
    aiHtml += `<div class="ai-message">
      <video controls width="300">
        <source src="${data.videoUrl}" type="video/mp4">
      </video>
    </div>`;
  }

  chatWindow.innerHTML += aiHtml;

  // Scroll til bunden
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
