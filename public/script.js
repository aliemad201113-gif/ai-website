const chatWindow = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  chatWindow.innerHTML += `<div class="user-message">🧑 ${message}</div>`;
  userInput.value = "";

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const data = await res.json();

  let aiHtml = `<div class="ai-message">🤖 ${data.reply}</div>`;

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
}
