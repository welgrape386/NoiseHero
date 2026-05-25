import { useState, useRef, useEffect } from 'react';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import { Send, Bot, AlertTriangle } from 'lucide-react';
import { apiSendChatbotMessage, type ChatMessage } from '../services/api';

type Message = {
  id: number;
  role: 'user' | 'bot';
  text: string;
  time: string;
};

const templates = [
  { label: '🦶 밤에 발소리가 들려요', query: '밤에 발소리가 들려요' },
  { label: '📏 법적 기준이 뭐예요?', query: '법적 기준이 뭐예요?' },
  { label: '📋 신고 절차 알려줘', query: '신고 절차 알려줘' },
  { label: '⚖️ 항의 문구 추천해줘', query: '항의 문구 추천해줘' },
  { label: '📄 증거 수집 방법', query: '증거 수집 방법' },
  { label: '📞 신고 기관 어디예요?', query: '신고 기관 어디예요?' },
  { label: '🏢 관리사무소가 안 들어줘요', query: '관리사무소가 안 들어줘요' },
  { label: '📑 PDF 증거 문서', query: 'PDF 증거 문서 어떻게 만들어요?' },
];

const initialBotMessage =
  `안녕하세요! 층간소음 AI 상담사입니다.\n\n` +
  `다음 주제에 대해 도움을 드릴 수 있습니다.\n\n` +
  `• 층간소음 법적 기준 안내\n` +
  `• 신고 및 조정 절차\n` +
  `• 증거 수집 방법\n` +
  `• 항의 문구 작성\n` +
  `• PDF 증거 문서 생성 안내\n\n` +
  `아래 빠른 질문 버튼을 누르거나 직접 질문해 주세요.`;

function getNowTime() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toConversationHistory(messages: Message[]): ChatMessage[] {
  return messages
    .filter(msg => msg.id !== 0)
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
}

export function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'bot',
      text: initialBotMessage,
      time: getNowTime(),
    },
  ]);

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, error]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: trimmed,
      time: getNowTime(),
    };

    const history = toConversationHistory(messages);

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setTyping(true);
    setError('');

    try {
      const res = await apiSendChatbotMessage(trimmed, history);

      const botMessage: Message = {
        id: Date.now() + 1,
        role: 'bot',
        text: res.data.message,
        time: getNowTime(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : '챗봇 응답을 불러오지 못했습니다.';

      setError(msg);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'bot',
          text:
            `죄송해요. 현재 AI 상담 연결에 문제가 있어요.\n\n` +
            `잠시 후 다시 시도해 주세요.\n\n` +
            `오류 내용: ${msg}`,
          time: getNowTime(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#F0F2FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Background />

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
            <div style={{ fontSize: 11, color: '#7A8AB8' }}>
              층간소음 전문 AI · 법령 기반 상담
            </div>
          </div>

          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(26,59,219,0.08)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: typing ? '#D93025' : '#1A3BDB' }} />
            <span style={{ fontSize: 10, color: typing ? '#D93025' : '#1A3BDB', fontWeight: 600 }}>
              {typing ? '응답 중' : '온라인'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: 8,
            marginBottom: 14,
          }}>
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
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #2D52F0, #1A3BDB)'
                  : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(16px)',
                border: msg.role === 'bot' ? '1px solid rgba(255,255,255,0.88)' : 'none',
                boxShadow: '0 4px 16px rgba(26,59,219,0.08)',
              }}>
                <div style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: msg.role === 'user' ? '#fff' : '#0A1866',
                  whiteSpace: 'pre-line',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {msg.text}
                </div>
              </div>

              <div style={{
                fontSize: 10,
                color: '#9AA6C0',
                marginTop: 4,
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}

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
              padding: '14px 18px',
              borderRadius: '18px 18px 18px 4px',
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.88)',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#1A3BDB',
                    opacity: 0.4,
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            margin: '4px 0 14px 40px',
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(217,48,37,0.08)',
            border: '1px solid rgba(217,48,37,0.18)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <AlertTriangle size={14} color="#C0271E" />
            <span style={{ fontSize: 11, color: '#C0271E' }}>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: '8px 16px',
        overflowX: 'auto',
        display: 'flex',
        gap: 8,
        scrollbarWidth: 'none',
      }}>
        {templates.map(tpl => (
          <button
            key={tpl.label}
            onClick={() => sendMessage(tpl.query)}
            disabled={typing}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.88)',
              fontSize: 12,
              fontWeight: 500,
              color: typing ? '#9AA6C0' : '#1A3BDB',
              cursor: typing ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {tpl.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '12px 16px 90px',
          background: 'rgba(240,242,250,0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="층간소음 관련 질문을 입력하세요..."
          disabled={typing}
          style={{
            flex: 1,
            padding: '14px 18px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.88)',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            fontSize: 13,
            color: '#0A1866',
            outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
            opacity: typing ? 0.7 : 1,
          }}
        />

        <button
          type="submit"
          disabled={!input.trim() || typing}
          style={{
            width: 46,
            height: 46,
            borderRadius: 999,
            background: input.trim() && !typing
              ? 'linear-gradient(135deg, #2D52F0, #1A3BDB)'
              : 'rgba(26,59,219,0.2)',
            border: 'none',
            cursor: input.trim() && !typing ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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