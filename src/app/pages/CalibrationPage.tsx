import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '../components/Background';
import {
  ChevronLeft, Mic, CheckCircle2, AlertCircle,
  Volume2, Tv, Smartphone,
} from 'lucide-react';
import { apiPostCalibration } from '../services/api';

const font = "'Nanum Gothic', 'Noto Sans KR', sans-serif";
const MEASURE_SECONDS = 15;

type Step = 'guide' | 'measuring' | 'complete' | 'error';

// Simple mic analyzer reused from MeasurePage pattern
// 실제 마이크 입력만 사용 (데모/시뮬레이션 없음)
class CalibrationAnalyzer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  onDb: (db: number) => void = () => {};

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });

    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.loop();
  }

  private loop() {
    if (!this.analyser) return;
    const buf = new Float32Array(this.analyser.fftSize);
    const tick = () => {
      this.analyser!.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      // MeasurePage의 MicrophoneAnalyzer와 동일한 공식(94 오프셋, 0~120 범위)으로 통일
      const db = rms > 0 ? Math.max(0, Math.min(120, 20 * Math.log10(rms) + 94)) : 0;
      this.onDb(db);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach(t => t.stop());
    this.ctx?.close();
  }
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
      border: '1.5px solid rgba(255,255,255,0.9)',
      borderRadius: 24, ...style,
    }}>
      {children}
    </div>
  );
}

const guideItems = [
  { icon: <Volume2 size={20} color="#1A3BDB" />, text: '조용한 방에서 진행해주세요' },
  { icon: <Tv size={20} color="#1A3BDB" />, text: 'TV, 선풍기, 에어컨 등을 꺼주세요' },
  { icon: <Smartphone size={20} color="#1A3BDB" />, text: '휴대폰을 책상 위에 평평하게 올려주세요' },
];

export function CalibrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('guide');
  const [elapsed, setElapsed] = useState(0);
  const [currentDb, setCurrentDb] = useState(0);
  const [samples, setSamples] = useState<number[]>([]);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [micErrorMsg, setMicErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const analyzerRef = useRef<CalibrationAnalyzer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = Math.min(elapsed / MEASURE_SECONDS, 1);

  const startMeasuring = async () => {
  setStep('measuring');
  setElapsed(0);
  setSamples([]);
  setMicErrorMsg('');

  const analyzer = new CalibrationAnalyzer();
  analyzerRef.current = analyzer;

  analyzer.onDb = (db) => {
    setCurrentDb(db);
    setSamples(prev => [...prev, db]);
  };

  try {
    await analyzer.start();
  } catch (err) {
    const msg =
      err instanceof Error && err.name === 'NotAllowedError'
        ? '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 접근을 허용해주세요.'
        : err instanceof Error
          ? err.message
          : '마이크에 접근할 수 없습니다.';

    setMicErrorMsg(msg);
    setStep('error');
    return;
  }

  timerRef.current = setInterval(() => {
    setElapsed(prev => {
      const next = prev + 1;
      if (next >= MEASURE_SECONDS) {
        clearInterval(timerRef.current!);
        finishMeasuring();
      }
      return next;
    });
  }, 1000);
};

  const finishMeasuring = () => {
    analyzerRef.current?.stop();
    setSamples(prev => {
      if (prev.length === 0) {
        setStep('error');
        return prev;
      }
      const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
      const rounded = Math.round(avg * 10) / 10;
      setBaseline(rounded);
      saveCalibration(rounded);
      return prev;
    });
  };

  const saveCalibration = async (db: number) => {
    setSaving(true);
    try {
      await apiPostCalibration(db);
    } catch {
      // even if API fails, show complete screen with local value
    }
    setSaving(false);
    setStep('complete');
  };

  useEffect(() => {
    return () => {
      analyzerRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const circumference = 2 * Math.PI * 54;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#F0F2FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Background />

      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, border: 'none', borderRadius: 12, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ChevronLeft size={18} color="#0A1866" />
          </button>
          <div>
            <div style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: '#0A1866' }}>마이크 보정</div>
            <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 2, fontFamily: font }}>측정 정확도를 높이기 위한 배경소음 보정</div>
          </div>
        </div>

        {/* ── 가이드 단계 ── */}
        {step === 'guide' && (
          <>
            {/* 안내 배너 */}
            <div style={{
              background: 'linear-gradient(135deg, #1A3BDB 0%, #2D52F0 100%)',
              borderRadius: 22, padding: '22px 20px', marginBottom: 24, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -16, top: -16, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', right: 24, bottom: -24, width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em', marginBottom: 8 }}>
                  마이크 보정이란?
                </div>
                <div style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.4, marginBottom: 8 }}>
                  스마트폰마다 마이크 성능이<br />달라 보정이 필요합니다
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, fontFamily: font }}>
                  {MEASURE_SECONDS}초 동안 조용한 환경의 배경 소음을 측정해<br />기기 특성에 맞는 기준값을 저장합니다.
                </div>
              </div>
            </div>

            {/* 준비 사항 */}
            <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: '#9AA6C0', letterSpacing: '0.05em', marginBottom: 10 }}>
              측정 전 준비사항
            </div>
            <GlassCard style={{ padding: '6px 4px', marginBottom: 24 }}>
              {guideItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  borderBottom: i < guideItems.length - 1 ? '1px solid rgba(200,208,232,0.3)' : 'none',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(26,59,219,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: '#2A3660', lineHeight: 1.45 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </GlassCard>

            {/* 시작 버튼 */}
            <button
              onClick={startMeasuring}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 999, border: 'none',
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                fontFamily: font,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Mic size={17} color="#fff" />
              보정 측정 시작
            </button>
          </>
        )}

        {/* ── 측정 중 ── */}
        {step === 'measuring' && (
          <>
            <GlassCard style={{ padding: '32px 24px', textAlign: 'center', marginBottom: 20 }}>
              {/* 원형 진행률 */}
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 24px' }}>
                <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(200,208,232,0.3)" strokeWidth="10" />
                  <circle
                    cx="70" cy="70" r="54" fill="none"
                    stroke="url(#calGrad)" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                  <defs>
                    <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2D52F0" />
                      <stop offset="100%" stopColor="#1A3BDB" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: font, fontSize: 28, fontWeight: 800, color: '#0A1866' }}>
                    {MEASURE_SECONDS - elapsed}
                  </div>
                  <div style={{ fontSize: 11, color: '#9AA6C0', fontFamily: font, fontWeight: 700 }}>초 남음</div>
                </div>
              </div>

              <div style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: '#0A1866', marginBottom: 4 }}>
                {currentDb.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 700, color: '#7A8AB8' }}>dB</span>
              </div>
              <div style={{ fontSize: 12, color: '#9AA6C0', fontFamily: font, fontWeight: 700 }}>
                현재 감지 소음
              </div>
            </GlassCard>

            <GlassCard style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.7, fontFamily: font, fontWeight: 700, textAlign: 'center' }}>
                측정 중입니다. 조용히 기다려주세요.<br />
                움직이거나 말하지 마세요.
              </div>
            </GlassCard>
          </>
        )}

        {/* ── 완료 ── */}
        {step === 'complete' && baseline !== null && (
          <>
            <GlassCard style={{ padding: '36px 24px', textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(26,59,219,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} color="#1A3BDB" fill="rgba(26,59,219,0.15)" />
              </div>
              <div style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: '#0A1866', marginBottom: 6 }}>
                보정 완료!
              </div>
              <div style={{ fontSize: 13, color: '#7A8AB8', fontFamily: font, fontWeight: 700, marginBottom: 24 }}>
                측정 기준값이 저장되었습니다
              </div>

              <div style={{ background: 'rgba(26,59,219,0.06)', border: '1px solid rgba(26,59,219,0.14)', borderRadius: 18, padding: '20px', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA6C0', fontFamily: font, marginBottom: 6 }}>내 기기 배경 소음 기준값</div>
                <div style={{ fontFamily: font, fontSize: 36, fontWeight: 800, color: '#1A3BDB' }}>
                  {baseline.toFixed(1)} <span style={{ fontSize: 16, fontWeight: 700, color: '#7A8AB8' }}>dB</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: '16px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.7, fontFamily: font, fontWeight: 700 }}>
                앞으로 층간소음 측정 시 이 값을 기준으로 초과 여부를 판정합니다. 환경이 바뀌면 마이페이지에서 재보정할 수 있습니다.
              </div>
            </GlassCard>

            <button
              onClick={() => navigate(-1)}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 999, border: 'none',
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font,
              }}
            >
              완료
            </button>
          </>
        )}

        {/* ── 에러 ── */}
        {step === 'error' && (
          <>
            <GlassCard style={{ padding: '36px 24px', textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(217,48,37,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertCircle size={32} color="#D93025" />
              </div>
              <div style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: '#0A1866', marginBottom: 8 }}>측정 실패</div>
              <div style={{ fontSize: 13, color: '#7A8AB8', fontFamily: font, fontWeight: 700 }}>
                {micErrorMsg || '측정 데이터를 수집하지 못했습니다.'}<br />다시 시도해주세요.
              </div>
            </GlassCard>
            <button
              onClick={() => setStep('guide')}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 999, border: 'none',
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: font,
              }}
            >
              다시 시도
            </button>
          </>
        )}

        {saving && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,24,102,0.25)', backdropFilter: 'blur(4px)' }}>
            <GlassCard style={{ padding: '24px 32px', textAlign: 'center' }}>
              <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: '#0A1866' }}>저장 중...</div>
            </GlassCard>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          70%, 100% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
