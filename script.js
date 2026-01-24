document.addEventListener("DOMContentLoaded", () => {
  const askBtn = document.getElementById("askBtn");
  const userInput = document.getElementById("userInput");
  const output = document.getElementById("output");

  if (!askBtn || !userInput || !output) {
    console.error("❌ HTML-elementer mangler");
    return;
  }

  askBtn.addEventListener("click", async () => {
    const prompt = userInput.value.trim();

    if (!prompt) {
      output.innerHTML = "❗ Skriv noget først";
      return;
    }

    output.innerHTML = "🤖 Aetherion AI arbejder...";

    try {
      const res = await fetch("/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const text = await res.text();
        output.innerHTML = `❌ Serverfejl (${res.status})<br>${text}`;
        return;
      }

      const data = await res.json();

      // fallback
      output.innerHTML = "⚠️ Ukendt svar fra AI";

      if (data.type === "chat" && data.reply) {
        output.innerHTML = data.reply;
      }

      if (data.type === "image" && data.b64) {
        output.innerHTML = `
          <img 
            src="data:image/png;base64,${data.b64}" 
            style="max-width:100%; border-radius:8px;" 
          />
        `;
      }

      if (data.type === "video" && data.videoUrl) {
        output.innerHTML = `
          <video controls autoplay loop style="max-width:100%; border-radius:8px;">
            <source src="${data.videoUrl}" type="video/mp4">
            Din browser understøtter ikke video.
          </video>
        `;
      }

    } catch (err) {
      console.error(err);
      output.innerHTML = `❌ Netværksfejl<br>${err.message}`;
    }
  });
});

