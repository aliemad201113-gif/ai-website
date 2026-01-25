document.addEventListener("DOMContentLoaded", () => {
  const askBtn = document.getElementById("askBtn");
  const userInput = document.getElementById("userInput");
  const fileInput = document.getElementById("fileInput");
  const output = document.getElementById("output");

  if (!askBtn || !userInput || !output) {
    console.error("❌ HTML-elementer mangler");
    return;
  }

  // Dynamisk API URL – virker lokalt og på Render
  const API_URL = window.location.hostname.includes("localhost")
    ? "http://localhost:3000/ask"
    : "https://aetherion-ai.onrender.com/ask";

  const STATUS_URL = window.location.hostname.includes("localhost")
    ? "http://localhost:3000/video-status"
    : "https://aetherion-ai.onrender.com/video-status";

  askBtn.addEventListener("click", async () => {
    const prompt = userInput.value.trim();
    const file = fileInput?.files[0];

    if (!prompt) {
      output.innerHTML = "❗ Skriv noget først";
      return;
    }

    output.innerHTML = "🤖 Aetherion AI arbejder...";

    try {
      // FormData til tekst + fil
      const formData = new FormData();
      formData.append("prompt", prompt);
      if (file) formData.append("image", file);

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        output.innerHTML = `❌ Serverfejl (${res.status})<br>${text}`;
        return;
      }

      const data = await res.json();

      // --- Håndtering af output ---
      if (data.type === "chat" && data.reply) {
        output.innerHTML = data.reply;
      } else if (data.type === "image" && data.url) {
        output.innerHTML = `<img src="${data.url}" style="max-width:100%; border-radius:8px;">`;
      } else if (data.type === "video" && data.jobId) {
        output.innerHTML = `🎬 Video job startet, venter på færdiggørelse...`;

        // Poll Runway video-status hvert 3. sekund
        const pollVideo = async () => {
          const statusRes = await fetch(`${STATUS_URL}/${data.jobId}`);
          const statusData = await statusRes.json();

          if (statusData.ready) {
            output.innerHTML = `
              <video controls autoplay loop style="max-width:100%; border-radius:8px;">
                <source src="${statusData.videoUrl}" type="video/mp4">
                Din browser understøtter ikke video.
              </video>
            `;
          } else if (statusData.failed) {
            output.innerHTML = "❌ Video generering fejlede";
          } else {
            setTimeout(pollVideo, 3000); // prøv igen om 3 sekunder
          }
        };

        pollVideo();
      } else {
        output.innerHTML = "⚠️ Ukendt svar fra AI";
      }

    } catch (err) {
      console.error(err);
      output.innerHTML = `❌ Netværksfejl<br>${err.message}`;
    }
  });
});
