// -------- CHAT --------
const chatBtn = document.getElementById("analyzeBtn");
const chatInput = document.getElementById("userInput");
const chatOutput = document.getElementById("output");

chatBtn.addEventListener("click", async () => {
  const message = chatInput.value.trim();
  if (!message) {
    chatOutput.innerHTML = "Skriv noget tekst først!";
    return;
  }

  chatOutput.innerHTML = "AI tænker...";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!res.ok) {
      const text = await res.text();
      chatOutput.innerHTML = `Server returnerede fejl! Status: ${res.status}<br>${text}`;
      return;
    }

    const data = await res.json();
    chatOutput.innerHTML = data.reply || "Ingen svar fra serveren.";

  } catch (err) {
    console.error(err);
    chatOutput.innerHTML = `Der skete en fejl under fetch.<br>${err}`;
  }
});

// -------- IMAGE --------
const imageBtn = document.getElementById("generateBtn");
const imageInput = document.getElementById("imagePrompt");
const imageOutput = document.getElementById("imageOutput");

imageBtn.addEventListener("click", async () => {
  const prompt = imageInput.value.trim();
  if (!prompt) {
    imageOutput.innerHTML = "Skriv en prompt først!";
    return;
  }

  imageOutput.innerHTML = "Genererer billede...";

  try {
    const res = await fetch("/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 403) {
        imageOutput.innerHTML = "Billedgenerator virker ikke endnu – kontoen skal være verified på OpenAI.";
      } else {
        imageOutput.innerHTML = `Server returnerede fejl! Status: ${res.status}<br>${text}`;
      }
      return;
    }

    const data = await res.json();

    // Håndter Base64-billeder direkte
    if (data.b64_json) {
      imageOutput.innerHTML = `<img src="data:image/png;base64,${data.b64_json}" alt="AI-billede" style="max-width:100%"/>`;
    } else if (data.imageUrl) {
      imageOutput.innerHTML = `<img src="${data.imageUrl}" alt="AI-billede" style="max-width:100%"/>`;
    } else {
      imageOutput.innerHTML = "Ingen billed-URL returneret fra serveren.";
    }

  } catch (err) {
    console.error(err);
    imageOutput.innerHTML = `Der skete en fejl under billedgenerering.<br>${err}`;
  }
});

