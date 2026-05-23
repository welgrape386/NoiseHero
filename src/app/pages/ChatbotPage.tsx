import { useState, useRef, useEffect } from 'react';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import { Send, Bot } from 'lucide-react';

type Message = {
  id: number;
  role: 'user' | 'bot';
  text: string;
  time: string;
};

const templates = [
  { label: '🦶 밤에 발소리가 들려요', query: '밤에 위층에서 발소리가 너무 심해요. 어떻게 해야 하나요?' },
  { label: '📏 기준치가 궁금해요', query: '층간소음 법적 기준치가 어떻게 되나요?' },
  { label: '📋 신고 절차 알려줘', query: '층간소음 신고 절차를 알려주세요.' },
  { label: '⚖️ 항의 문구 추천해줘', query: '윗층에 보낼 정중한 항의 문구를 추천해줘.' },
  { label: '🌙 야간 기준은?', query: '야간 소음 기준이 주간이랑 다른가요?' },
  { label: '📄 증거 수집 방법', query: '층간소음 증거 수집은 어떻게 해야 하나요?' },
  { label: '📞 신고 기관 정보', query: '층간소음 신고 기관 연락처를 알려주세요.' },
];

const botResponses: Record<string, string> = {
  '기준': `📏 **층간소음 법적 기준 (공동주택)**\n\n**직접충격음**\n• 주간(06~22시): Leq 39 dB / Lmax 57 dB\n• 야간(22~06시): Leq 34 dB / Lmax 49 dB\n\n**공기전달음**\n• 주간: Leq 45 dB\n• 야간: Leq 40 dB\n\n기준 초과 시 이웃사이센터(1661-2642)에 상담 신청이 가능합니다.`,
  '신고': `📋 **층간소음 신고 절차**\n\n**1단계: 이웃사이센터 상담**\n전화: 1661-2642 (평일 9~18시)\n\n**2단계: 현장 측정 신청**\nLH 층간소음 관리센터에 현장 방문 측정 신청\n\n**3단계: 조정 신청**\n환경분쟁조정위원회 조정 신청\n\n**4단계: 민사 소송**\n측정 데이터와 피해 기록을 증거로 제출\n\n소음ON에서 측정한 데이터를 PDF로 출력해 증거로 활용하세요.`,
  '발소리': `🦶 **발소리 층간소음 대응 방법**\n\n**즉시 할 수 있는 것들:**\n1. 소음ON 앱으로 측정 기록 남기기\n2. 날짜·시간·지속시간 메모\n3. 동영상 촬영 (스마트폰으로)\n\n**이웃에게 직접 요청:**\n관리사무소를 통한 소음 민원 접수\n\n**장기적 조치:**\n이웃사이센터 조정 신청 → 환경부 분쟁조정 신청\n\n지속적으로 기준을 초과하면 강제 조정이 가능합니다.`,
  '항의': `✍️ **정중한 항의 문구 예시**\n\n---\n안녕하세요, 아래층에 거주하는 이웃입니다.\n\n최근 늦은 밤 발소리와 물건 끄는 소리로 인해 수면에 어려움을 겪고 있습니다. 공동주택 층간소음 기준(야간 Leq 34dB)을 참고하시어 생활 소음에 유의해 주시면 감사하겠습니다.\n\n정중히 부탁드립니다.\n---\n\n문자나 메모로 전달하시면 기록도 됩니다.`,
  '야간': `🌙 **야간 층간소음 기준 (22:00~06:00)**\n\n직접충격음\n• Leq 34 dB (주간 39 dB보다 5 dB 낮음)\n• Lmax 49 dB (주간 57 dB보다 8 dB 낮음)\n\n야간은 기준이 더 엄격하므로 같은 소음이라도 야간에 발생하면 기준 초과 가능성이 높습니다.\n\n소음ON의 야간 모드로 측정하면 자동으로 야간 기준이 적용됩니다.`,
  '증거': `📄 **층간소음 증거 수집 방법**\n\n**1. 소음 측정 기록**\n소음ON으로 정기적으로 측정 → PDF 출력\n\n**2. 동영상 녹화**\n소음 발생 시 스마트폰으로 현장 녹화 (날짜·시간 포함)\n\n**3. 일지 작성**\n날짜, 시간, 지속시간, 소음 종류를 꼼꼼히 기록\n\n**4. 목격자 확보**\n같이 거주하는 가족의 진술서\n\n**5. 의료 기록**\n소음으로 인한 수면 장애, 불안증 등 진료 기록\n\n이 모든 자료를 갖추면 환경분쟁조정 시 유리합니다.`,
  '기관': `📞 **층간소음 신고 기관 연락처**\n\n**이웃사이센터**\n전화: 1661-2642 (평일 9~18시)\n\n**환경분쟁조정위원회**\n전화: 1301 (평일 9~18시)\n\n**민사 소송**\n법원에 직접 접수 가능\n\n소음ON에서 측���한 데이터를 PDF로 출력해 증거로 활용하세요.`,
  'default': `안녕하세요! 층간소음 AI 상담사입니다. 🏢\n\n다음 주제에 대해 도움을 드릴 수 있습니다:\n\n• 층간소음 법적 기준 안내\n• 소음 측정 방법\n• 신고 및 조정 절차\n• 이웃 항의 방법\n• 증거 수집 방법\n\n아래 빠른 질문 버튼을 눌러보시거나 직접 질문해 주세요!`,
};

function getBotResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('기준') || q.includes('dB') || q.includes('데시벨')) return botResponses['기준'];
  if (q.includes('신고') || q.includes('조정') || q.includes('절차')) return botResponses['신고'];
  if (q.includes('발소리') || q.includes('발') || q.includes('뛰')) return botResponses['발소리'];
  if (q.includes('항의') || q.includes('문구') || q.includes('편지')) return botResponses['항의'];
  if (q.includes('야간') || q.includes('밤') || q.includes('야간')) return botResponses['야간'];
  if (q.includes('증거') || q.includes('수집') || q.includes('기록')) return botResponses['증거'];
  if (q.includes('기관') || q.includes('연락처') || q.includes('신고')) return botResponses['기관'];
  return `"${query}"에 대한 질문 감사합니다.\n\n층간소음과 관련된 구체적인 상황을 알려주시면 더 정확한 답변을 드릴 수 있습니다.\n\n예: "밤 11시에 위층 발소리가 심해요", "기준치가 궁금해요", "신고 방법 알려줘"`;
}

export function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0, role: 'bot',
      text: botResponses['default'],
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, time: now }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: getBotResponse(text),
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 1200 + Math.random() * 600);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#F0F2FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Background />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '20px 20px 12px',
        background: 'rgba(240,242,250,0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: '#0A1866' }}>
              소음ON AI 상담
            </div>
            <div style={{ fontSize: 11, color: '#7A8AB8' }}>층간소음 전문 AI · 24시간 상담</div>
          </div>
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(26,59,219,0.08)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A3BDB' }} />
            <span style={{ fontSize: 10, color: '#1A3BDB', fontWeight: 600 }}>온라인</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: 8, marginBottom: 14,
          }}>
            {/* Avatar */}
            {msg.role === 'bot' && (
              <div style={{
                width: 32, height: 32, borderRadius: 11, flexShrink: 0,
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={15} color="#fff" />
              </div>
            )}

            <div style={{ maxWidth: '80%' }}>
              <div style={{
                padding: '12px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #2D52F0, #1A3BDB)'
                  : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(16px)',
                border: msg.role === 'bot' ? '1px solid rgba(255,255,255,0.88)' : 'none',
                boxShadow: '0 4px 16px rgba(26,59,219,0.08)',
              }}>
                <div style={{
                  fontSize: 13, lineHeight: 1.6,
                  color: msg.role === 'user' ? '#fff' : '#0A1866',
                  whiteSpace: 'pre-line',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {msg.text}
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#9AA6C0', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 11,
              background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={15} color="#fff" />
            </div>
            <div style={{
              padding: '14px 18px', borderRadius: '18px 18px 18px 4px',
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.88)',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#1A3BDB', opacity: 0.4,
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Templates */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '8px 16px',
        overflowX: 'auto',
        display: 'flex', gap: 8,
        scrollbarWidth: 'none',
      }}>
        {templates.map(tpl => (
          <button
            key={tpl.label}
            onClick={() => sendMessage(tpl.query)}
            style={{
              flexShrink: 0,
              padding: '8px 14px', borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.88)',
              fontSize: 12, fontWeight: 500, color: '#1A3BDB',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {tpl.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative', zIndex: 2,
          padding: '12px 16px 90px',
          background: 'rgba(240,242,250,0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="층간소음 관련 질문을 입력하세요..."
          style={{
            flex: 1, padding: '14px 18px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.88)',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            fontSize: 13, color: '#0A1866',
            outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          style={{
            width: 46, height: 46, borderRadius: 999,
            background: input.trim() && !typing ? 'linear-gradient(135deg, #2D52F0, #1A3BDB)' : 'rgba(26,59,219,0.2)',
            border: 'none', cursor: input.trim() && !typing ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          <Send size={18} color="#fff" />
        </button>
      </form>

      <TabBar />

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}