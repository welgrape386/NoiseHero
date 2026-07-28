import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import {
  ChevronLeft, CheckCircle2, ArrowRight,
  Building2, Phone, Scale, ExternalLink, X,
} from 'lucide-react';

const strongFont = "'Nanum Gothic', 'Noto Sans KR', sans-serif";

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.58)',
      backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
      border: '1px solid rgba(255,255,255,0.88)',
      borderRadius: 24, ...style,
    }}>
      {children}
    </div>
  );
}

type StepStatus = 'done' | 'active' | 'pending';

interface Step {
  num: number;
  title: string;
  subtitle: string;
  status: StepStatus;
  icon: React.ReactNode;
  desc: string;
  btnLabel: string;
  onPress?: () => void;
}

const recommendationItems = [
  '관리사무소 상담을 진행한 경우',
  '이웃사이센터 상담 또는 현장진단을 진행한 경우',
  '동일한 소음이 반복적으로 발생한 경우',
  '야간 시간대 피해가 지속된 경우',
  '일정 기간 동안 피해 기록이 누적된 경우',
];

function Step3Modal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(10,24,102,0.4)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#F4F6FB',
          borderRadius: '28px 28px 0 0',
          border: 'none',
          padding: '0 0 40px',
        }}
      >
        {/* 상단 헤더 (파란 그라디언트) */}
        <div style={{
          background: 'linear-gradient(135deg, #1A3BDB 0%, #2D52F0 100%)',
          borderRadius: '28px 28px 0 0',
          padding: '20px 22px 22px',
          position: 'relative',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.3)', margin: '0 auto 18px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: strongFont, letterSpacing: '0.06em', marginBottom: 6 }}>3단계 안내</div>
              <div style={{ fontFamily: strongFont, fontSize: 19, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>
                환경분쟁조정위원회
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
            >
              <X size={16} color="#fff" />
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 22px 0' }}>

          {/* 기관 소개 */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA6C0', fontFamily: strongFont, letterSpacing: '0.05em', marginBottom: 8 }}>기관 소개</div>
            <div style={{
              background: '#fff',
              borderRadius: 18,
              padding: '16px 18px',
              fontSize: 13,
              color: '#4A5880',
              lineHeight: 1.8,
              border: '1px solid rgba(200,208,232,0.4)',
            }}>
              환경분쟁조정위원회는 층간소음 피해가 지속되거나, 기존 조치 이후에도 문제가 반복되는 경우 <strong style={{ color: '#0A1866' }}>분쟁조정을 신청</strong>할 수 있는 공식 기관입니다.
            </div>
          </div>

          {/* 신청 권장 상황 */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA6C0', fontFamily: strongFont, letterSpacing: '0.05em', marginBottom: 8 }}>신청을 고려할 수 있는 상황</div>
            <div style={{ background: '#fff', borderRadius: 18, padding: '6px 4px', border: '1px solid rgba(200,208,232,0.4)' }}>
              {recommendationItems.map((label, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderBottom: i < recommendationItems.length - 1 ? '1px solid rgba(200,208,232,0.3)' : 'none',
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(26,59,219,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#1A3BDB', fontFamily: strongFont }}>{i + 1}</span>
                  </div>
                  <span style={{ fontFamily: strongFont, fontSize: 13, color: '#3A4870', lineHeight: 1.45 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 참고 안내 */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: 'rgba(26,59,219,0.06)',
            border: '1px solid rgba(26,59,219,0.13)',
            borderRadius: 14,
            padding: '13px 15px',
            marginBottom: 22,
          }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1A3BDB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>i</span>
            </div>
            <div style={{ fontSize: 12, color: '#4A5EA8', lineHeight: 1.7, fontFamily: strongFont }}>
              위 상황은 신청 필수 조건이 아닌 참고 정보입니다. 해당 사항이 있다면 신청을 적극 고려해보세요.
            </div>
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="https://ecc.me.go.kr" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%', padding: '15px 0', borderRadius: 999, border: 'none',
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                fontFamily: strongFont,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                공식 사이트 이동
                <ExternalLink size={14} color="#fff" />
              </button>
            </a>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 999,
                border: '1px solid rgba(154,166,192,0.35)',
                background: '#fff',
                color: '#7A8AB8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: strongFont,
              }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionStepsPage() {
  const navigate = useNavigate();
  const [showStep3Modal, setShowStep3Modal] = useState(false);

  const steps: Step[] = [
    {
      num: 1,
      title: '관리사무소',
      subtitle: '완료',
      status: 'done',
      icon: <Building2 size={20} color="#1A3BDB" />,
      desc: '관리사무소에 층간소음 민원을 접수하세요. 서면 민원 접수 시 처리 결과를 요청할 수 있습니다.',
      btnLabel: '민원서 PDF 생성',
      onPress: () => navigate('/report'),
    },
    {
      num: 2,
      title: '이웃사이센터',
      subtitle: '추천',
      status: 'active',
      icon: <Phone size={20} color="#1A3BDB" />,
      desc: '한국환경공단 이웃사이센터(1661-2642)에 상담을 신청하면 전문가가 중재를 도와줍니다. 무료 서비스입니다.',
      btnLabel: '1661-2642 전화',
      onPress: () => { window.location.href = 'tel:16612642'; },
    },
    {
      num: 3,
      title: '환경분쟁조정위원회',
      subtitle: '안내',
      status: 'pending',
      icon: <Scale size={20} color="#1A3BDB" />,
      desc: '이웃사이센터 조정 실패 후 법적 기준 초과가 반복될 경우 중앙환경분쟁조정위원회에 조정 신청이 가능합니다.',
      btnLabel: '신청 조건 확인',
      onPress: () => setShowStep3Modal(true),
    },
  ];

  const statusColor: Record<StepStatus, string> = {
    done: '#1A3BDB',
    active: '#1A3BDB',
    pending: '#7A8AB8',
  };

  const statusBg: Record<StepStatus, string> = {
    done: 'rgba(26,59,219,0.08)',
    active: 'rgba(26,59,219,0.06)',
    pending: 'rgba(122,138,184,0.1)',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#F0F2FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Background />

      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, border: 'none', borderRadius: 12, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ChevronLeft size={18} color="#0A1866" />
          </button>
          <div>
            <div style={{ fontFamily: strongFont, fontSize: 20, fontWeight: 700, color: '#0A1866' }}>대응 단계 안내</div>
            <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 2 }}>층간소음 피해 단계별 조치 가이드</div>
          </div>
        </div>

        {/* 페이지 소개 카드 */}
        <div style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #1A3BDB 0%, #2D52F0 60%, #3B6FFF 100%)',
          borderRadius: 22,
          padding: '22px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 배경 장식 원 */}
          <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', right: 30, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'inline-block',
              padding: '3px 10px', borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              fontFamily: strongFont, marginBottom: 10, letterSpacing: '0.04em',
            }}>
              대응 단계 안내
            </div>
            <div style={{ fontFamily: strongFont, fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.35 }}>
              층간소음, 단계별로<br />차근차근 대응하세요
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
              관리사무소 → 이웃사이센터 → 환경분쟁조정위원회<br />
              순서대로 상황에 맞는 조치를 안내해 드립니다.
            </div>
          </div>
        </div>

        {/* 단계 리스트 */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 28, top: 48, bottom: 48, width: 2, background: 'linear-gradient(180deg, rgba(26,59,219,0.3) 0%, rgba(200,208,232,0.3) 100%)', borderRadius: 2 }} />

          {steps.map((step, idx) => {
            const isActive = step.status === 'active';
            const isDone = step.status === 'done';
            const isPending = step.status === 'pending';

            return (
              <div key={step.num} style={{ position: 'relative', marginBottom: idx < steps.length - 1 ? 16 : 0 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 20,
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.78)',
                  border: isDone ? '2px solid rgba(26,59,219,0.4)' : isActive ? '2px solid rgba(26,59,219,0.3)' : '2px solid rgba(122,138,184,0.25)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                }}>
                  {isDone
                    ? <CheckCircle2 size={22} color="#1A3BDB" fill="rgba(26,59,219,0.1)" />
                    : isActive
                      ? <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', background: 'rgba(26,59,219,0.08)', animation: 'ping 2s infinite' }} />
                          {step.icon}
                        </div>
                      : step.icon
                  }
                </div>

                <div style={{ marginLeft: 72 }}>
                  <GlassCard style={{
                    padding: '20px 20px',
                    background: 'rgba(255,255,255,0.82)',
                    border: '2px solid rgba(26,59,219,0.45)',
                    boxShadow: '0 4px 20px rgba(26,59,219,0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: strongFont, fontSize: 16, fontWeight: 800, color: '#0A1866' }}>
                        {step.num}단계 · {step.title}
                      </span>
                      <div style={{ padding: '3px 9px', borderRadius: 999, background: statusBg[step.status], border: `1px solid ${statusColor[step.status]}28` }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[step.status] }}>{step.subtitle}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.7, marginBottom: 14 }}>
                      {step.desc}
                    </div>

                    <button
                      onClick={step.onPress}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 999, border: 'none',
                        background: isActive ? 'linear-gradient(135deg, #2D52F0, #1A3BDB)' : isPending ? 'rgba(122,138,184,0.12)' : 'rgba(26,59,219,0.08)',
                        color: isActive ? '#fff' : isPending ? '#7A8AB8' : '#1A3BDB',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: strongFont,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      {step.btnLabel}
                      <ArrowRight size={13} color={isActive ? '#fff' : isPending ? '#7A8AB8' : '#1A3BDB'} />
                    </button>
                  </GlassCard>
                </div>
              </div>
            );
          })}
        </div>

        {/* 공식 기관 바로가기 */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8C98B8', marginBottom: 12 }}>공식 기관 바로가기</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: '이웃사이센터', sub: '한국환경공단 층간소음 상담', href: 'tel:16612642', label: '1661-2642' },
              { name: '중앙환경분쟁조정위원회', sub: '분쟁 조정 신청 안내', href: 'https://ecc.me.go.kr', label: '사이트 방문' },
              { name: '환경부 소음진동 정책', sub: '층간소음 법령 및 기준 확인', href: 'https://www.me.go.kr', label: '사이트 방문' },
            ].map(link => (
              <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.75)', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(26,59,219,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ExternalLink size={16} color="#1A3BDB" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: strongFont, fontSize: 13, fontWeight: 700, color: '#0A1866' }}>{link.name}</div>
                    <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 2 }}>{link.sub}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1A3BDB', padding: '4px 10px', borderRadius: 999, background: 'rgba(26,59,219,0.08)' }}>
                    {link.label}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <TabBar />

      {showStep3Modal && <Step3Modal onClose={() => setShowStep3Modal(false)} />}

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          70%, 100% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
