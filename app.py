import os
from flask import Flask, request, render_template, jsonify
from dotenv import load_dotenv
from openai import OpenAI
import anthropic
import time

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

app = Flask(__name__)

# --------------------------------------------
# MCPAgent: 모델 컨텍스트 프로토콜을 활용한 에이전트 클래스
# --------------------------------------------

class MCPAgent:
    def __init__(self, name, role, model):
        self.name = name            # 예: "Claude" 또는 "GPT"
        self.role = role            # 역할 설명 (시스템 프롬프트)
        self.model = model          # "claude" 또는 "gpt"
        self.context = []           # 이전 발화 기록. 형식: [[speaker, message], ...]
    
    def add_to_context(self, speaker, message):
        self.context.append([speaker, message])
    
    def respond(self, input_message):
        # 대화 컨텍스트를 포함한 프롬프트 생성
        prompt = f"{self.role}\n\n"
        for sp, msg in self.context:
            prompt += f"{sp}: {msg}\n"
        prompt += f"User: {input_message}"
        
        if self.model == "claude":
            response = anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=500,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            reply = response.content[0].text.strip()
        else:  # model == "gpt"
            # GPT의 경우, 간단히 시스템 프롬프트와 함께 입력 메시지를 전달
            # (필요시 대화 기록을 포함하는 메시지 배열로 확장할 수 있음)
            messages = [{"role": "system", "content": self.role}]
            for sp, msg in self.context:
                # 단순화를 위해, 자신의 응답은 "assistant", 나머지는 "user"로 구분
                messages.append({"role": "assistant" if sp == self.name else "user", "content": msg})
            messages.append({"role": "user", "content": input_message})
            
            response =client.chat.completions.create(
                model="gpt-4",
                temperature=0.7,
                messages=messages,
                max_tokens=500
            )
            reply = response.choices[0].message.content.strip()
        
        self.add_to_context(self.name, reply)
        return reply

# --------------------------------------------
# 웹 엔드포인트
# --------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/mcp-turn", methods=["POST"])
def mcp_turn():
    data = request.json
    claude_role = data["claude_role"]
    gpt_role = data["gpt_role"]
    current_message = data["current_message"]
    current_speaker = data["current_speaker"]
    
    # 클라이언트에서 전달된 컨텍스트가 없으면 빈 리스트로 초기화
    claude_context = data.get("claude_context", [])
    gpt_context = data.get("gpt_context", [])
    
    # MCP 에이전트 생성 및 컨텍스트 복원
    claude_agent = MCPAgent("Claude", claude_role, "claude")
    gpt_agent = MCPAgent("GPT", gpt_role, "gpt")
    claude_agent.context = claude_context
    gpt_agent.context = gpt_context
    
    # 현재 턴의 주체에 따라 응답 생성
    if current_speaker == "claude":
        reply = claude_agent.respond(current_message)
        next_speaker = "gpt"
    else:
        reply = gpt_agent.respond(current_message)
        next_speaker = "claude"
    
    return jsonify({
        "reply": reply,
        "current_message": reply,
        "current_speaker": next_speaker,
        "claude_context": claude_agent.context,
        "gpt_context": gpt_agent.context
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)