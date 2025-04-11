let currentMessage = "";
let currentSpeaker = "claude";
let claudeContext = [];
let gptContext = [];
let autoTurnCount = 0;
const maxAutoTurns = 10;  // 10턴 자동
let isAutoRunning = false;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chatForm");
  const chatContainer = document.getElementById("chatContainer");
  const nextBtn = document.getElementById("nextBtn");

  // 대화 시작 버튼 클릭 시
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 상태 초기화
    chatContainer.innerHTML = "";
    const formData = new FormData(form);
    currentMessage = formData.get("start_message");
    currentSpeaker = "claude";
    claudeContext = [];
    gptContext = [];
    autoTurnCount = 0;
    isAutoRunning = true;

    // 더보기 버튼 숨김
    nextBtn.style.display = "none";

    // 10턴 자동 진행
    await autoTurn(formData);
  });

  // 더보기 버튼 클릭: 추가로 10턴 진행
  nextBtn.addEventListener("click", async () => {
    const formData = new FormData(document.getElementById("chatForm"));
    autoTurnCount = 0;
    isAutoRunning = true;
    nextBtn.style.display = "none";
    await autoTurn(formData);
  });

  async function autoTurn(formData) {
    while (isAutoRunning && autoTurnCount < maxAutoTurns) {
      // 로딩 인디케이터 표시
      showLoadingIndicator(chatContainer);
      await fetchTurn(formData);
      hideLoadingIndicator();

      autoTurnCount++;
      // 턴 사이 약간의 텀
      await sleep(800);
    }
    isAutoRunning = false;
    // 10턴 끝났다면 더보기 버튼 노출
    nextBtn.style.display = "block";
  }

  async function fetchTurn(formData) {
    const response = await fetch("/mcp-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claude_role: formData.get("claude_role"),
        gpt_role: formData.get("gpt_role"),
        current_message: currentMessage,
        current_speaker: currentSpeaker,
        claude_context: claudeContext,
        gpt_context: gptContext
      })
    });
    const data = await response.json();
    if (data.reply) {
      // 말풍선 추가
      const bubble = document.createElement("div");
      // 이번 턴 화자
      const speakerLabel = (currentSpeaker === "claude") ? "Claude" : "GPT";
      // 카카오톡 테마: me, friend 구분
      bubble.className = "bubble " + (currentSpeaker === "claude" ? "friend" : "me");
      bubble.innerHTML = `<p class="speakerName">${speakerLabel}</p><p>${data.reply}</p>`;
      chatContainer.appendChild(bubble);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // 상태 업데이트
      currentMessage = data.current_message;
      currentSpeaker = data.current_speaker;
      claudeContext = data.claude_context;
      gptContext = data.gpt_context;
    }
  }

  function showLoadingIndicator(container) {
    const loader = document.createElement("div");
    loader.id = "loaderDiv";
    loader.className = "bubble loading me"; 
    // 아래는 픽사베이 링크 (직접 다운로드 후 static/폴더에 저장 가능)
    loader.innerHTML = `
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
