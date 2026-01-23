const askBtn = document.getElementById("analyzeBtn");
const userInput = document.getElementById("userInput");
const output = document.getElementById("output");

askBtn.addEventListener("click", async () => {
  const prompt = userInput.value.trim();
  if (!prompt) {
    output.innerHTML = "Skriv noget tekst først!";
    return;
  }

  output.innerHTML = "AI arbejder...";

  try {
    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const text = await res.text();
      output.innerHTML = `Serverfejl (${res.status})<br>${text}`;
      return;
    }

    const data = await res.json();

    // 🧠 AI svarer med type
    if (data.type === "chat") {
      output.innerHTML = data.reply;
    }

    if (data.type === "image") {
      output.innerHTML = `
        <img src="data:image/png;base64,${data.b64}" 
             style="max-width:100%" />
      `;
    }

    if (data.type === "video") {
      output.innerHTML = `
        <video controls autoplay loop style="max-width:100%">
          <source src="${data.videoUrl}" type="video/mp4">
          Din browser understøtter ikke video.
        </video>
      `;
    }

  } catch (err) {
    console.error(err);
    output.innerHTML = `Der skete en fejl.<br>${err}`;
  }
});

