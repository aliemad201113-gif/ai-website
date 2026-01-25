document.addEventListener("DOMContentLoaded", () => {
  const askBtn = document.getElementById("askBtn");
  const userInput = document.getElementById("userInput");
  const fileInput = document.getElementById("fileInput");
  const output = document.getElementById("output");

  if (!askBtn || !userInput || !output) {
    console.error("❌ HTML-elementer mangler");
    return;
  }

  askBtn.addEventListener("click", async () => {
    const prompt = userInput.value.trim();
    const file = fileInput.files[0];

    if (!prompt) {
      output.innerHTML = "❗ Skriv noget først";
      return;
    }

    output.innerHTML = "🤖 Aetherion AI arbejder...";

    try {
      // Brug FormData til både tekst og fil
      const formData = new FormData();
      formData.append("prompt", prompt);
      if (file) formData.append("image", file);

      const res = await fetch("/ask", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        output.innerHTML = `❌ Serverfejl (${res.status})<br>${text}`;
        return;
      }

      const data = await res.json();

      // --- Vis output ---
      if (data.type === "chat" && data.reply) {
        output.innerHTML = data.reply;
      } else if (data.type === "image" && data.url) {
        output.innerHTML = `<img src="${data.url}" style="max-width:100%; border-radius:8px;">`;
      } else if (data.type === "video" && data.videoUrl) {
        output.innerHTML = `
          <video controls autoplay loop style="max-width:100%; border-radius:8px;">
            <source src="${data.videoUrl}" type="video/mp4">
            Din browser understøtter ikke video.
          </video>
        `;
      } else {
        output.innerHTML = "⚠️ Ukendt svar fra AI";
      }

    } catch (err) {
      console.error(err);
      output.innerHTML = `❌ Netværksfejl<br>${err.message}`;
    }
  });
});
