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
    const res = await fetch("https://malignantly-extranuclear-ryann.ngrok-free.dev/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });

    console.log("Fetch status:", res.status);

    if (!res.ok) {
      const text = await res.text();
      output.innerHTML = `Server returnerede fejl!<br>Status: ${res.status}<br>Response: ${text}`;
      return;
    }

    const data = await res.json();
    console.log("Server data:", data);

    output.innerHTML = data.reply || "Ingen svar fra serveren.";

  } catch (err) {
    console.error("Fejl i fetch:", err);
    output.innerHTML = `Der skete en fejl under fetch.<br>${err}`;
  }
}





