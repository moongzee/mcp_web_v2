let currentMessage = "";
let currentSpeaker = "claude";
let claudeContext = [];
let gptContext = [];
let autoTurnCount = 0;
const maxAutoTurns = 10;
let isAutoRunning = false;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chatForm");
  const chatContainer = document.getElementById("chatContainer");
  const nextBtn = document.getElementById("nextBtn");
  const startBtn = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (isAutoRunning) {
      isAutoRunning = false;
      startBtn.textContent = "대화 시작";
      return;
    }

    // 초기화
    chatContainer.innerHTML = "";
    const formData = new FormData(form);
    currentMessage = formData.get("start_message");
    currentSpeaker = "claude";
    claudeContext = [];
    gptContext = [];
    autoTurnCount = 0;
    isAutoRunning = true;

    startBtn.textContent = "대화 중지";
    nextBtn.style.display = "none";

    await runInitialTwoTurns(formData);
    await autoTurn(formData);

    if (!isAutoRunning) {
      startBtn.textContent = "대화 시작";
    }
  });

  nextBtn.addEventListener("click", async () => {
    const formData = new FormData(document.getElementById("chatForm"));
    autoTurnCount = 0;
    isAutoRunning = true;
    nextBtn.style.display = "none";
    await autoTurn(formData);
  });

  async function runInitialTwoTurns(formData) {
    if (!isAutoRunning) return;

    showLoadingIndicator(chatContainer, currentSpeaker);
    await fetchTurn(formData, true);  // reset true
    hideLoadingIndicator();
    await sleep(500);

    if (!isAutoRunning) return;
    showLoadingIndicator(chatContainer, currentSpeaker);
    await fetchTurn(formData, false);
    hideLoadingIndicator();
    await sleep(500);
  }

  async function autoTurn(formData) {
    while (isAutoRunning && autoTurnCount < maxAutoTurns) {
      showLoadingIndicator(chatContainer, currentSpeaker);
      await fetchTurn(formData, false);
      hideLoadingIndicator();
      autoTurnCount++;
      await sleep(800);
    }

    isAutoRunning = false;
    nextBtn.style.display = "block";
    startBtn.textContent = "대화 시작";
  }

  async function fetchTurn(formData, resetFlag) {
    const response = await fetch("/mcp-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claude_role: formData.get("claude_role"),
        gpt_role: formData.get("gpt_role"),
        current_message: currentMessage,
        current_speaker: currentSpeaker,
        claude_context: claudeContext,
        gpt_context: gptContext,
        reset: resetFlag
      })
    });

    const data = await response.json();
    if (data.reply) {
      const bubble = document.createElement("div");
      const speakerLabel = (currentSpeaker === "claude") ? "Claude" : "GPT";
      bubble.className = "bubble " + (currentSpeaker === "claude" ? "friend" : "me");
      bubble.innerHTML = `<p class="speakerName">${speakerLabel}</p><p>${data.reply}</p>`;
      chatContainer.appendChild(bubble);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      currentMessage = data.current_message;
      currentSpeaker = data.current_speaker;
      claudeContext = data.claude_context;
      gptContext = data.gpt_context;
    }
  }

  function showLoadingIndicator(container, speaker) {
    const loader = document.createElement("div");
    loader.id = "loaderDiv";
    loader.className = "bubble loading " + (speaker === "claude" ? "friend" : "me");
    loader.innerHTML = `
      <p class="speakerName">${speaker === "claude" ? "Claude" : "GPT"}</p>
      <img src="/static/load-32_128.gif"
           alt="로딩 중..." style="width:40px;height:40px;" />
    `;
    container.appendChild(loader);
    container.scrollTop = container.scrollHeight;
  }

  function hideLoadingIndicator() {
    const loader = document.getElementById("loaderDiv");
    if (loader) {
      loader.remove();
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
