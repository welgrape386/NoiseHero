export function TabBar() {
  return `
    <div class="tab-bar">
      <div class="tab-item" id="tab-home" onclick="navigate('home')">홈</div>
      <div class="tab-item" id="tab-measure" onclick="navigate('measure')">측정</div>
      <div class="tab-item" id="tab-report" onclick="navigate('report')">리포트</div>
      <div class="tab-item" id="tab-chatbot" onclick="navigate('chatbot')">AI</div>
      <div class="tab-item" id="tab-mypage" onclick="navigate('mypage')">마이</div>
    </div>
  `;
}