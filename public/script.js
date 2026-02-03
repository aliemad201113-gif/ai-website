document.addEventListener("DOMContentLoaded", () => {
  const chat = document.getElementById("chat");
  const input = document.getElementById("userInput");
  const fileInput = document.getElementById("fileInput");
  const sendBtn = document.getElementById("sendBtn");

  const API_URL = "http://localhost:3000/ask";

  // Tilføj besked i chat
  function addMessage(text, className) {
    const div = document.createElement("div");
    div.className = className;
    div.innerHTML = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  // Send besked til serveren
  async function sendMessage(prompt, file) {
    if (!prompt && !file) return;

    let userHtml = prompt || "";
    if (file) {
      userHtml += `<br><img src="${URL.createObjectURL(file)}" width="200">`;
    }

    addMessage(userHtml, "user");

    const formData = new FormData();
    if (prompt) formData.append("prompt", prompt);
    if (file) formData.append("image", file);

    addMessage("🤖 AI tænker...", "ai");

    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      const data = await res.json();

      // Fjern loading
      document.querySelector(".ai:last-child")?.remove();

      addMessage(data.reply || "Ingen svar", "ai");
    } catch (err) {
      console.error(err);
      document.querySelector(".ai:last-child")?.remove();
      addMessage("❌ Netværksfejl", "ai");
    }
  }

  // Klik send
  sendBtn.addEventListener("click", () => {
    sendMessage(input.value.trim(), fileInput.files[0]);
    input.value = "";
    fileInput.value = "";
  });

  // Enter send
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Paste billede
  document.addEventListener("paste", (e) => {
    for (const item of e.clipboardData.items) {
      if (item.type.includes("image")) {
        sendMessage("", item.getAsFile());
      }
    }
  });
});

