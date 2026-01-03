// -------- CHAT --------
document.getElementById("analyzeBtn").addEventListener("click", sendMessage);

async function sendMessage() {
  const input = document.getElementById("userInput").value;
  const output = document.getElementById("output");

  if (!input.trim()) {
    output.innerHTML = "Skriv noget tekst først!";
    return;
  }

  output.innerHTML = "AI tænker...";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });

    if (!res.ok) {
      const text = await res.text();
      output.innerHTML = `Server returnerede fejl! Status: ${res.status}<br>${text}`;
      return;
    }

    const data = await res.json();
    output.innerHTML = data.reply || "Ingen svar fra serveren.";

  } catch (err) {
    console.error(err);
    output.innerHTML = `Der skete en fejl under fetch.<br>${err}`;
  }
}

// -------- IMAGE --------
document.getElementById("generateBtn").addEventListener("click", generateImage);

async function generateImage() {
  const prompt = document.getElementById("imagePrompt").value;
  const output = document.getElementById("imageOutput");

  if (!prompt.trim()) {
    output.innerHTML = "Skriv en prompt først!";
    return;
  }

  output.innerHTML = "Genererer billede...";

  try {
    const res = await fetch("/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const text = await res.text();
      output.innerHTML = `Server returnerede fejl! Status: ${res.status}<br>${text}`;
      return;
    }

    const data = await res.json();

    if (data.imageUrl) {
      output.innerHTML = `<img src="${data.imageUrl}" alt="AI-billede" style="max-width:100%"/>`;
    } else {
      output.innerHTML = "Ingen billede-URL fra serveren.";
    }

  } catch (err) {
    console.error(err);
    output.innerHTML = `Der skete en fejl under billedgenerering.<br>${err}`;
  }
}


