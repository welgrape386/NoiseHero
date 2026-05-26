import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import { ChevronLeft, AlertTriangle, Save, Square, CheckCircle, Mic } from 'lucide-react';
import { apiSaveMeasure, LEGAL_STANDARDS, isNighttime } from '../services/api';

type MeasureType = 'impact' | 'airborne';
type MeasureState = 'idle' | 'measuring' | 'done';

/** Web Audio API로 실시간 dB 측정 */
class MicrophoneAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private onUpdate: ((db: number) => void) | null = null;

  async start(onUpdate: (db: number) => void) {
    this.onUpdate = onUpdate;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyze();
    } catch (err) {
      console.error('마이크 접근 실패:', err);
      throw new Error('마이크 권한이 거부되었습니다.');
    }
  }

  private analyze = () => {
    if (!this.analyser || !this.dataArray || !this.onUpdate) return;

    this.analyser.getByteTimeDomainData(this.dataArray);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / this.dataArray.length);
    const db = rms > 0 ? 20 * Math.log10(rms) + 94 : 0;
    const clampedDb = Math.max(0, Math.min(120, db));

    this.onUpdate(clampedDb);
    this.rafId = requestAnimationFrame(this.analyze);
  };

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.microphone) this.microphone.disconnect();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.stream = null;
    this.rafId = null;
    this.onUpdate = null;
  }
}

function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.58)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '1px solid rgba(255,255,255,0.88)',
        borderRadius: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 측정 유형과 시간대에 따른 법적 기준 반환 */
function getLimits(type: MeasureType) {
  const night = isNighttime();
  const zone = night ? '야간' : '주간';
  const noiseType = type === 'impact' ? '직접충격' : '공기전달';

  const std = LEGAL_STANDARDS.공동주택[noiseType][zone];

  return {
    label: zone,
    leqLimit: std.leq,
    lmaxLimit: std.lmax,
  };
}

export function MeasurePage() {
  const navigate = useNavigate();

  const [measureType, setMeasureType] = useState<MeasureType>('impact');
  const [state, setState] = useState<MeasureState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [dbVal, setDbVal] = useState(0);
  const [leq, setLeq] = useState(0);
  const [lmax, setLmax] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [micError, setMicError] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allSamplesRef = useRef<number[]>([]);
  const micAnalyzerRef = useRef<MicrophoneAnalyzer | null>(null);

  const duration = measureType === 'impact' ? 60 : 300;
  const limits = getLimits(measureType);

  async function startMeasure() {
    setMicError('');
    setSaved(false);
    setSaveError('');
    setElapsed(0);
    setDbVal(0);
    setLeq(0);
    setLmax(0);
    allSamplesRef.current = [];

    try {
      const analyzer = new MicrophoneAnalyzer();
      micAnalyzerRef.current = analyzer;

      await analyzer.start((db) => {
        const val = Math.round(db * 10) / 10;
        allSamplesRef.current.push(val);

        const arr = allSamplesRef.current;
        const energySum = arr.reduce((acc, v) => acc + Math.pow(10, v / 10), 0);
        const newLeq = Math.round(10 * Math.log10(energySum / arr.length) * 10) / 10;
        const newLmax = Math.max(...arr);

        setDbVal(val);
        setLeq(newLeq);
        setLmax(newLmax);
      });

      setState('measuring');

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= duration) {
            stopMeasure();
            return duration;
          }

          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '마이크 접근에 실패했습니다.';
      setMicError(msg);
    }
  }

  function stopMeasure() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (micAnalyzerRef.current) {
      micAnalyzerRef.current.stop();
      micAnalyzerRef.current = null;
    }

    setState('done');
  }

  async function saveMeasure() {
    if (saving || saved) return;

    setSaving(true);
    setSaveError('');

    try {
      const noise_type = measureType === 'impact' ? '직접충격' : '공기전달';

      await apiSaveMeasure({
      leq,
      lmax,
      noise_type,
    }); 

      setSaved(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  function resetMeasure() {
    setState('idle');
    setElapsed(0);
    setDbVal(0);
    setLeq(0);
    setLmax(0);
    setSaved(false);
    setSaveError('');
    setMicError('');
    allSamplesRef.current = [];
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);

      if (micAnalyzerRef.current) {
        micAnalyzerRef.current.stop();
      }
    };
  }, []);

  const isLeqOver = leq > limits.leqLimit;
  const isLmaxOver = limits.lmaxLimit !== null && lmax > limits.lmaxLimit;
  const isOver = isLeqOver || isLmaxOver;

  const progress = Math.min(elapsed / duration, 1);
  const gaugeArc = Math.min((dbVal / 100) * 290, 290);
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const aiChips =
    measureType === 'impact'
      ? ['⚡ 발소리', '충격음', '반복성', leq > 55 ? '고강도' : '저강도']
      : ['🌊 지속소음', '공기전달', '생활소음'];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#F0F2FA',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Background />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px 100px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: 38,
              height: 38,
              border: 'none',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} color="#0A1866" />
          </button>

          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#0A1866',
              margin: 0,
            }}
          >
            실시간 측정
          </h1>

          {state === 'measuring' && (
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                background: 'rgba(217,48,37,0.1)',
                border: '1px solid rgba(217,48,37,0.2)',
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#D93025',
                  animation: 'noise-pulse 1.2s infinite',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#C0271E',
                  letterSpacing: '0.06em',
                }}
              >
                LIVE
              </span>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {state !== 'idle' && isOver && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 16px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(217,48,37,.92), rgba(185,28,28,.88))',
              color: '#fff',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <AlertTriangle size={18} color="#fff" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>법적 기준 초과 감지</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>
                Leq {leq} dB — 기준({limits.leqLimit} dB) 초과 +
                {Math.round((leq - limits.leqLimit) * 10) / 10} dB
              </div>
            </div>
          </div>
        )}

        {/* Toggle */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            marginTop: 14,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {(['impact', 'airborne'] as MeasureType[]).map(t => (
            <button
              key={t}
              onClick={() => {
                if (state === 'idle') setMeasureType(t);
              }}
              disabled={state !== 'idle'}
              style={{
                flex: 1,
                border: 'none',
                padding: '10px 0',
                borderRadius: 999,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                cursor: state === 'idle' ? 'pointer' : 'default',
                background:
                  measureType === t
                    ? 'linear-gradient(135deg, #2D52F0, #1A3BDB)'
                    : 'transparent',
                color: measureType === t ? '#fff' : '#7A8AB8',
                transition: 'all 0.2s',
              }}
            >
              {t === 'impact' ? '직접충격 (1분)' : '공기전달 (5분)'}
            </button>
          ))}
        </div>

        {/* Gauge */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
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

            <circle
              cx="130"
              cy="130"
              r="108"
              fill="none"
              stroke="rgba(26,59,219,0.08)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="440 440"
              transform="rotate(-220 130 130)"
            />

            <circle
              cx="130"
              cy="130"
              r="92"
              fill="none"
              stroke="rgba(26,59,219,0.05)"
              strokeWidth="1"
            />

            <circle
              cx="130"
              cy="130"
              r="108"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${gaugeArc} 440`}
              transform="rotate(-220 130 130)"
              filter="url(#glow)"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />

            {state === 'measuring' && (
              <circle
                cx="130"
                cy="130"
                r="120"
                fill="none"
                stroke="rgba(26,59,219,0.15)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${progress * 440} 440`}
                transform="rotate(-220 130 130)"
                style={{ transition: 'stroke-dasharray 1s linear' }}
              />
            )}
          </svg>

          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {state === 'measuring' && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#D93025',
                  animation: 'noise-pulse 1.2s infinite',
                  marginBottom: 4,
                }}
              />
            )}

            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 64,
                color: '#0A1866',
                lineHeight: 1,
              }}
            >
              {state === 'idle' ? '—' : dbVal}
            </div>

            <div style={{ fontSize: 13, color: '#7A8AB8' }}>dB(A)</div>

            {state !== 'idle' && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isOver ? '#D93025' : '#1A3BDB',
                  marginTop: 2,
                }}
              >
                {state === 'done' ? '측정 완료' : isOver ? '기준 초과' : '정상 범위'}
              </div>
            )}

            {state === 'idle' && (
              <div style={{ fontSize: 11, color: '#7A8AB8', marginTop: 2 }}>대기 중</div>
            )}
          </div>
        </div>

        {/* 마이크 에러 */}
        {micError && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              borderRadius: 14,
              background: 'rgba(217,48,37,0.08)',
              border: '1px solid rgba(217,48,37,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle size={16} color="#C0271E" />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#C0271E',
                  marginBottom: 2,
                }}
              >
                마이크 접근 실패
              </div>
              <div style={{ fontSize: 11, color: '#7A8AB8' }}>{micError}</div>
              <div style={{ fontSize: 10, color: '#9AA6C0', marginTop: 4 }}>
                브라우저 설정에서 마이크 권한을 허용해주세요.
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {state === 'idle' && (
            <button
              onClick={startMeasure}
              style={{
                flex: 1,
                border: 'none',
                padding: 16,
                borderRadius: 999,
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 8px 24px rgba(26,59,219,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Mic size={16} color="#fff" />
              측정 시작
            </button>
          )}

          {state === 'measuring' && (
            <>
              <button
                onClick={stopMeasure}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: 16,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0A1866',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Square size={14} color="#0A1866" fill="#0A1866" />
                측정 중지
              </button>

              <button
                onClick={saveMeasure}
                disabled={saving || saved}
                style={{
                  flex: 1.4,
                  border: 'none',
                  padding: 16,
                  borderRadius: 999,
                  background: saved
                    ? 'rgba(26,59,219,0.2)'
                    : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                  color: '#fff',
                  cursor: saving || saved ? 'default' : 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saved ? <CheckCircle size={14} color="#fff" /> : <Save size={14} color="#fff" />}
                {saving ? '저장 중...' : saved ? '저장됨 ✓' : '이력 저장'}
              </button>
            </>
          )}

          {state === 'done' && (
            <>
              <button
                onClick={resetMeasure}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: 16,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0A1866',
                }}
              >
                다시 측정
              </button>

              <button
                onClick={saveMeasure}
                disabled={saving || saved}
                style={{
                  flex: 1.4,
                  border: 'none',
                  padding: 16,
                  borderRadius: 999,
                  background: saved
                    ? 'rgba(26,59,219,0.2)'
                    : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                  color: '#fff',
                  cursor: saving || saved ? 'default' : 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saved ? <CheckCircle size={14} color="#fff" /> : <Save size={14} color="#fff" />}
                {saving ? '저장 중...' : saved ? '저장 완료 ✓' : '이력 저장'}
              </button>
            </>
          )}
        </div>

        {/* 저장 오류 */}
        {saveError && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(217,48,37,0.08)',
              border: '1px solid rgba(217,48,37,0.2)',
              fontSize: 12,
              color: '#C0271E',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={13} color="#C0271E" />
            {saveError}
          </div>
        )}

        {/* Info Card */}
        {state !== 'idle' && (
          <GlassCard style={{ marginTop: 16, padding: '6px 20px' }}>
            {[
              { key: '측정 시간', val: timeStr, danger: false },
              {
                key: `Leq (${measureType === 'impact' ? '1분' : '5분'} 평균)`,
                val: `${leq} dB(A)`,
                danger: isLeqOver,
              },
              {
                key: 'Lmax (최고값)',
                val: `${lmax} dB(A)`,
                danger: isLmaxOver,
              },
              {
                key: '시간대',
                val: null,
                badge: `${limits.label} ${new Date().toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`,
              },
              {
                key: '법적 기준',
                val:
                  limits.lmaxLimit !== null
                    ? `Leq ${limits.leqLimit} / Lmax ${limits.lmaxLimit} dB`
                    : `Leq ${limits.leqLimit} dB (Lmax 미적용)`,
                danger: false,
              },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderTop: i > 0 ? '1px solid rgba(26,59,219,0.07)' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: '#7A8AB8' }}>{row.key}</span>

                {'badge' in row && row.badge ? (
                  <div
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: 'rgba(26,59,219,0.1)',
                      color: '#1A3BDB',
                      fontSize: 11,
                    }}
                  >
                    {row.badge}
                  </div>
                ) : (
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: row.danger ? '#C0271E' : '#0A1866',
                    }}
                  >
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
            <div style={{ fontSize: 10, color: '#7A8AB8', marginBottom: 8 }}>
              AI 소음 분류 결과
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {aiChips.map((chip, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background:
                      i === 0
                        ? 'rgba(26,59,219,0.1)'
                        : i === aiChips.length - 1 && leq > 55
                          ? 'rgba(217,48,37,0.08)'
                          : 'rgba(255,255,255,0.7)',
                    color:
                      i === 0
                        ? '#1A3BDB'
                        : i === aiChips.length - 1 && leq > 55
                          ? '#C0271E'
                          : '#0A1866',
                  }}
                >
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

            <div
              style={{
                fontSize: 12,
                color: '#9AA6C0',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {measureType === 'impact'
                ? '직접충격음: 발소리, 뛰는 소리 등 충격성 소음\nLeq + Lmax 기준 적용 (1분 측정)'
                : '공기전달음: TV, 음악 등 지속성 소음\nLeq 기준 적용 (5분 측정, Lmax 미적용)'}
            </div>

            <div
              style={{
                marginTop: 14,
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(26,59,219,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 11, color: '#7A8AB8' }}>현재 시간대</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1A3BDB' }}>
                {limits.label} — Leq {limits.leqLimit} dB 기준
              </span>
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