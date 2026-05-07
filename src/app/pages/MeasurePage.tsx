import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import { ChevronLeft, AlertTriangle, Save, Square } from 'lucide-react';

type MeasureType = 'impact' | 'airborne';
type MeasureState = 'idle' | 'measuring' | 'done';

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

function getHourInfo() {
  const h = new Date().getHours();
  return h >= 6 && h < 22
    ? { label: '주간', leqLimit: 39, lmaxLimit: 57 }
    : { label: '야간', leqLimit: 34, lmaxLimit: 49 };
}

export function MeasurePage() {
  const navigate = useNavigate();
  const [measureType, setMeasureType] = useState<MeasureType>('impact');
  const [state, setState] = useState<MeasureState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [dbVal, setDbVal] = useState(0);
  const [leq, setLeq] = useState(0);
  const [lmax, setLmax] = useState(0);
  const [samples, setSamples] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const duration = measureType === 'impact' ? 60 : 300; // 1 min or 5 min
  const hourInfo = getHourInfo();

  function startMeasure() {
    setState('measuring');
    setElapsed(0);
    setDbVal(0);
    setLeq(0);
    setLmax(0);
    setSamples([]);
    setSaved(false);

    // Simulate noise samples every 200ms
    const allSamples: number[] = [];
    sampleRef.current = setInterval(() => {
      const base = measureType === 'impact' ? 52 : 38;
      const noise = base + Math.random() * 18 - 4;
      const val = Math.round(noise * 10) / 10;
      allSamples.push(val);

      const newLeq = Math.round(
        10 * Math.log10(allSamples.reduce((acc, v) => acc + Math.pow(10, v / 10), 0) / allSamples.length) * 10
      ) / 10;
      const newLmax = Math.max(...allSamples);

      setDbVal(Math.round(val));
      setLeq(Math.round(newLeq));
      setLmax(Math.round(newLmax));
      setSamples([...allSamples]);
    }, 200);

    // Timer
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= duration) {
          stopMeasure();
          return duration;
        }
        return prev + 1;
      });
    }, 1000);
  }

  function stopMeasure() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (sampleRef.current) clearInterval(sampleRef.current);
    setState('done');
  }

  function saveMeasure() {
    const existing = JSON.parse(localStorage.getItem('noise_history') || '[]');
    const now = new Date();
    const record = {
      id: Date.now(),
      time: now.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      db: leq,
      lmax,
      type: measureType === 'impact' ? '직접충격' : '공기전달',
      period: hourInfo.label,
      over: leq > hourInfo.leqLimit,
    };
    localStorage.setItem('noise_history', JSON.stringify([record, ...existing]));
    setSaved(true);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sampleRef.current) clearInterval(sampleRef.current);
    };
  }, []);

  const isOver = leq > hourInfo.leqLimit;
  const progress = Math.min(elapsed / duration, 1);
  // Gauge: map dB 0-100 to arc 0-290
  const gaugeArc = Math.min(dbVal / 100 * 290, 290);
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const aiChips = measureType === 'impact'
    ? ['⚡ 발소리', '충격음', '반복성', leq > 55 ? '고강도' : '저강도']
    : ['🌊 지속소음', '공기전달', '생활소음'];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#F0F2FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Background />
      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: 38, height: 38, border: 'none', borderRadius: 12,
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} color="#0A1866" />
          </button>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#0A1866', margin: 0 }}>
            실시간 측정
          </h1>
          {state === 'measuring' && (
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(217,48,37,0.1)', border: '1px solid rgba(217,48,37,0.2)',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#D93025', animation: 'noise-pulse 1.2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#C0271E', letterSpacing: '0.06em' }}>LIVE</span>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {state !== 'idle' && isOver && (
          <div style={{
            marginTop: 14, padding: '10px 16px', borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(217,48,37,.92), rgba(185,28,28,.88))',
            color: '#fff', display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <AlertTriangle size={18} color="#fff" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>법적 기준 초과 감지</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>
                현재 Leq {leq} dB — 기준({hourInfo.leqLimit} dB) 초과 +{leq - hourInfo.leqLimit} dB
              </div>
            </div>
          </div>
        )}

        {/* Toggle */}
        <div style={{
          display: 'flex', gap: 4, padding: 4, marginTop: 14,
          borderRadius: 999, background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(12px)',
        }}>
          {(['impact', 'airborne'] as MeasureType[]).map(t => (
            <button
              key={t}
              onClick={() => { if (state === 'idle') setMeasureType(t); }}
              disabled={state !== 'idle'}
              style={{
                flex: 1, border: 'none', padding: '10px 0', borderRadius: 999,
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
                cursor: state === 'idle' ? 'pointer' : 'default',
                background: measureType === t ? 'linear-gradient(135deg, #2D52F0, #1A3BDB)' : 'transparent',
                color: measureType === t ? '#fff' : '#7A8AB8',
                transition: 'all 0.2s',
              }}
            >
              {t === 'impact' ? '직접충격 (1분)' : '공기전달 (5분)'}
            </button>
          ))}
        </div>

        {/* Gauge */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
          <svg width="240" height="240" viewBox="0 0 260 260">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1A3BDB" />
                <stop offset="60%" stopColor="#6B8AFF" />
                <stop offset="100%" stopColor="#D93025" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Track */}
            <circle cx="130" cy="130" r="108" fill="none" stroke="rgba(26,59,219,0.08)" strokeWidth="14"
              strokeLinecap="round" strokeDasharray="440 440" transform="rotate(-220 130 130)" />
            {/* Inner ring */}
            <circle cx="130" cy="130" r="92" fill="none" stroke="rgba(26,59,219,0.05)" strokeWidth="1" />
            {/* Active arc */}
            <circle cx="130" cy="130" r="108" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${gaugeArc} 440`}
              transform="rotate(-220 130 130)"
              filter="url(#glow)"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
            {/* Progress arc (time) */}
            {state === 'measuring' && (
              <circle cx="130" cy="130" r="120" fill="none" stroke="rgba(26,59,219,0.15)" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${progress * 440} 440`}
                transform="rotate(-220 130 130)"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
            )}
          </svg>

          {/* Center */}
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {state === 'measuring' && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D93025', animation: 'noise-pulse 1.2s infinite', marginBottom: 4 }} />
            )}
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 64, color: '#0A1866', lineHeight: 1 }}>
              {state === 'idle' ? '—' : dbVal}
            </div>
            <div style={{ fontSize: 13, color: '#7A8AB8' }}>dB(A)</div>
            {state !== 'idle' && (
              <div style={{ fontSize: 11, fontWeight: 600, color: isOver ? '#D93025' : '#1A3BDB', marginTop: 2 }}>
                {state === 'done' ? '측정 완료' : isOver ? '기준 초과' : '정상 범위'}
              </div>
            )}
            {state === 'idle' && (
              <div style={{ fontSize: 11, color: '#7A8AB8', marginTop: 2 }}>대기 중</div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {state === 'idle' && (
            <button
              onClick={startMeasure}
              style={{
                flex: 1, border: 'none', padding: 16, borderRadius: 999,
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff', cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600,
                boxShadow: '0 8px 24px rgba(26,59,219,0.25)',
              }}
            >
              측정 시작
            </button>
          )}
          {state === 'measuring' && (
            <>
              <button
                onClick={stopMeasure}
                style={{
                  flex: 1, border: 'none', padding: 16, borderRadius: 999,
                  background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
                  color: '#0A1866',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Square size={14} color="#0A1866" fill="#0A1866" />
                측정 중지
              </button>
              <button
                onClick={saveMeasure}
                style={{
                  flex: 1.4, border: 'none', padding: 16, borderRadius: 999,
                  background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                  color: '#fff', cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Save size={14} color="#fff" />
                {saved ? '저장됨 ✓' : '이력 저장'}
              </button>
            </>
          )}
          {state === 'done' && (
            <>
              <button
                onClick={() => { setState('idle'); setDbVal(0); setLeq(0); setLmax(0); setElapsed(0); setSaved(false); }}
                style={{
                  flex: 1, border: 'none', padding: 16, borderRadius: 999,
                  background: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: '#0A1866',
                }}
              >
                다시 측정
              </button>
              <button
                onClick={() => { if (!saved) saveMeasure(); }}
                style={{
                  flex: 1.4, border: 'none', padding: 16, borderRadius: 999,
                  background: saved ? 'rgba(26,59,219,0.3)' : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                  color: '#fff', cursor: saved ? 'default' : 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Save size={14} color="#fff" />
                {saved ? '저장 완료 ✓' : '이력 저장'}
              </button>
            </>
          )}
        </div>

        {/* Info Card */}
        {state !== 'idle' && (
          <GlassCard style={{ marginTop: 16, padding: '6px 20px' }}>
            {[
              { key: '측정 시간', val: timeStr, danger: false },
              { key: `Leq (${measureType === 'impact' ? '1분' : '5분'} 평균)`, val: `${leq} dB(A)`, danger: leq > hourInfo.leqLimit },
              { key: 'Lmax (최고값)', val: `${lmax} dB(A)`, danger: lmax > hourInfo.lmaxLimit },
              { key: '시간대', val: null, badge: `${hourInfo.label} ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` },
              { key: '법적 기준', val: `Leq ${hourInfo.leqLimit} / Lmax ${hourInfo.lmaxLimit} dB`, danger: false },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderTop: i > 0 ? '1px solid rgba(26,59,219,0.07)' : 'none',
              }}>
                <span style={{ fontSize: 12, color: '#7A8AB8' }}>{row.key}</span>
                {row.badge ? (
                  <div style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(26,59,219,0.1)', color: '#1A3BDB', fontSize: 11 }}>
                    {row.badge}
                  </div>
                ) : (
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: row.danger ? '#C0271E' : '#0A1866' }}>
                    {row.val}
                  </span>
                )}
              </div>
            ))}
          </GlassCard>
        )}

        {/* AI Classification */}
        {state !== 'idle' && (
          <div style={{ marginTop: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#7A8AB8', marginBottom: 8 }}>AI 소음 분류 결과</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {aiChips.map((chip, i) => (
                <div key={i} style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: i === 0 ? 'rgba(26,59,219,0.1)' :
                    i === aiChips.length - 1 && leq > 55 ? 'rgba(217,48,37,0.08)' :
                      'rgba(255,255,255,0.7)',
                  color: i === 0 ? '#1A3BDB' :
                    i === aiChips.length - 1 && leq > 55 ? '#C0271E' :
                      '#0A1866',
                }}>
                  {chip}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Idle State */}
        {state === 'idle' && (
          <GlassCard style={{ marginTop: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#7A8AB8', marginBottom: 8 }}>측정 안내</div>
            <div style={{ fontSize: 12, color: '#9AA6C0', lineHeight: 1.6 }}>
              {measureType === 'impact'
                ? '직접충격음: 발소리, 뛰는 소리 등 충격성 소음\nLeq + Lmax 기준 적용 (1분 측정)'
                : '공기전달음: TV, 음악 등 지속성 소음\nLeq 기준 적용 (5분 측정)'}
            </div>
            <div style={{ marginTop: 14, padding: '10px 16px', borderRadius: 12, background: 'rgba(26,59,219,0.06)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#7A8AB8' }}>현재 시간대</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1A3BDB' }}>{hourInfo.label} — Leq {hourInfo.leqLimit} dB 기준</span>
            </div>
          </GlassCard>
        )}
      </div>

      <TabBar />

      <style>{`
        @keyframes noise-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
