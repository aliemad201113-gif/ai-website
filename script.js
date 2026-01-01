document.getElementById("analyzeBtn").addEventListener("click", sendMessage);

async function sendMessage() {
  const input = document.getElementById("userInput").value;
  const output = document.getElementById("output");

  if (!input.trim()) {
    output.innerText = "Skriv noget tekst først!";
    return;
  }

  output.innerHTML = "AI tænker... <br><small>Debug: sender besked til server...</small>";

  try {
    const res = await fetch("https://aetherion-ai.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });

    if (!res.ok) {
      const text = await res.text();
      output.innerHTML = `Server returnerede fejl!<br>Status: ${res.status}<br>Response: ${text}`;
      return;
    }

    const data = await res.json();
    output.innerHTML = data.reply || "Ingen svar fra serveren.";

  } catch (err) {
    console.error("Fejl i fetch:", err);
    output.innerHTML = `Der skete en fejl under fetch.<br>${err}`;
  }
}






