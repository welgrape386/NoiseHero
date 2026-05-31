import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import {
  ChevronLeft,
  AlertTriangle,
  Save,
  Square,
  CheckCircle,
  Mic,
} from 'lucide-react';
import {
  apiSaveMeasure,
  apiClassifyNoise,
  LEGAL_STANDARDS,
  isNighttime,
  type NoiseClassifyResponse,
} from '../services/api';

type MeasureType = 'impact' | 'airborne';
type NoiseType = '직접충격' | '공기전달';
type MeasureState = 'idle' | 'measuring' | 'done';

const strongFont = "'Space Grotesk', 'Pretendard', 'Noto Sans KR', sans-serif";

class MicrophoneAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private onUpdate: ((db: number) => void) | null = null;
  private calibrationOffset = 0;

  async start(onUpdate: (db: number) => void, calibrationOffset = 0) {
    this.onUpdate = onUpdate;
    this.calibrationOffset = calibrationOffset;

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

      this.dataArray = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount)
      );
      this.analyze();
    } catch (err) {
      console.error('마이크 접근 실패:', err);
      throw new Error('마이크 권한이 거부되었습니다.');
    }
  }

  private analyze = () => {
    if (!this.analyser || !this.dataArray || !this.onUpdate) return;

    this.analyser.getByteTimeDomainData(
      this.dataArray as Uint8Array<ArrayBuffer>
    );

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / this.dataArray.length);
    const db = rms > 0 ? 20 * Math.log10(rms) + 94 + this.calibrationOffset : 0;
    const clampedDb = Math.max(0, Math.min(120, db));

    this.onUpdate(clampedDb);
    this.rafId = requestAnimationFrame(this.analyze);
  };

  getStream() {
    return this.stream;
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.microphone) this.microphone.disconnect();
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    if (this.audioContext) this.audioContext.close();

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

function getLimits(type: MeasureType) {
  const night = isNighttime();
  const label = night ? '야간' : '주간';
  const noiseType = type === 'impact' ? '직접충격' : '공기전달';
  const std = LEGAL_STANDARDS.공동주택[noiseType][label];

  return {
    label,
    leqLimit: std.leq,
    lmaxLimit: std.lmax,
  };
}

function isValidSource(value?: string) {
  if (!value) return false;

  const trimmed = value.trim();

  return (
    trimmed !== '' &&
    trimmed !== '분류 안 됨' &&
    trimmed !== '주소음원 미분류' &&
    trimmed !== '미분류' &&
    trimmed !== '없음' &&
    trimmed !== '부소음원 없음' &&
    trimmed !== 'undefined' &&
    trimmed !== 'null'
  );
}

function normalizeNoiseType(value?: string): NoiseType | undefined {
  if (!value) return undefined;

  if (value.includes('공기전달') || value.includes('공기')) {
    return '공기전달';
  }

  if (value.includes('직접충격') || value.includes('충격')) {
    return '직접충격';
  }

  return undefined;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [classifyResult, setClassifyResult] = useState<NoiseClassifyResponse | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allSamplesRef = useRef<number[]>([]);
  const micAnalyzerRef = useRef<MicrophoneAnalyzer | null>(null);

  const duration = measureType === 'impact' ? 60 : 300;
  const limits = getLimits(measureType);
  

  async function classifyRecordedAudio(file: File) {
    const maxSize = 20 * 1024 * 1024;

    setAudioFile(file);

    if (file.size > maxSize) {
      setClassifyError('파일 용량이 너무 큽니다. 20MB 이하 파일만 업로드해 주세요.');
      setClassifyResult(null);
      return;
    }

    setClassifying(true);
    setClassifyError('');
    setClassifyResult(null);

    try {
      const raw = await apiClassifyNoise(file);

      const result: NoiseClassifyResponse =
        raw.result &&
        typeof raw.result === 'object' &&
        !Array.isArray(raw.result)
          ? (raw.result as NoiseClassifyResponse)
          : raw;

      setClassifyResult(result);

      const detectedNoiseType = normalizeNoiseType(
        result.noise_type ||
          result.category ||
          result.label ||
          result.predicted_class
      );

      if (detectedNoiseType === '공기전달') {
        setMeasureType('airborne');
      }

      if (detectedNoiseType === '직접충격') {
        setMeasureType('impact');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 소음 분류에 실패했습니다.';
      setClassifyError(msg);
    } finally {
      setClassifying(false);
    }
  }

  async function startMeasure() {
    setMicError('');
    setSaved(false);
    setSaveError('');
    setClassifyError('');
    setClassifyResult(null);
    setAudioFile(null);
    setElapsed(0);
    setDbVal(0);
    setLeq(0);
    setLmax(0);
    allSamplesRef.current = [];
    recordedChunksRef.current = [];

    try {
      const analyzer = new MicrophoneAnalyzer();
      micAnalyzerRef.current = analyzer;

      await analyzer.start(db => {
        const val = Math.round(db * 10) / 10;
        allSamplesRef.current.push(val);

        const arr = allSamplesRef.current;
        const newLeq =
          Math.round(
            10 *
              Math.log10(
                arr.reduce((acc, v) => acc + Math.pow(10, v / 10), 0) / arr.length
              ) *
              10
          ) / 10;

        const newLmax = Math.max(...arr);

        setDbVal(val);
        setLeq(newLeq);
        setLmax(newLmax);
      }, 0);

      const stream = analyzer.getStream();

      if (!stream) {
        throw new Error('녹음 스트림을 가져오지 못했습니다.');
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        const file = new File([blob], `noise-record-${Date.now()}.webm`, {
          type: blobType,
        });

        setAudioFile(file);

        if (file.size > 0) {
          void classifyRecordedAudio(file);
        } else {
          setClassifyError('녹음된 오디오가 비어 있어 AI 분류를 진행하지 못했습니다.');
        }
      };

      recorder.start();

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

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (micAnalyzerRef.current) {
      micAnalyzerRef.current.stop();
      micAnalyzerRef.current = null;
    }

    setState('done');
  }

  function getPrimarySource() {
    if (!classifyResult) return undefined;

    const source =
      classifyResult.primary_source ||
      classifyResult.label ||
      classifyResult.predicted_class ||
      classifyResult.category ||
      classifyResult.description ||
      (typeof classifyResult.result === 'string' ? classifyResult.result : undefined)

    return isValidSource(source) ? source : undefined;
  }

  function getSecondarySource() {
    if (!classifyResult) return undefined;

    return (
      classifyResult.secondary_source ||
      classifyResult.description ||
      classifyResult.sub_label ||
      (typeof classifyResult.result === 'string' ? classifyResult.result : undefined)
    );
  }

  function getDetectedNoiseType(): NoiseType {
    const detected = normalizeNoiseType(
      classifyResult?.noise_type ||
        classifyResult?.category ||
        classifyResult?.label ||
        classifyResult?.predicted_class
    );

    if (detected) return detected;

    return measureType === 'impact' ? '직접충격' : '공기전달';
  }

  async function saveMeasure() {
    if (saving || saved) return;

    if (classifying) {
      setSaveError('AI 소음 분석이 끝난 뒤 저장해 주세요.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const noise_type = getDetectedNoiseType();

      await apiSaveMeasure({
        leq,
        lmax,
        noise_type,
        secondary_source: getSecondarySource() || '없음',
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
    setDbVal(0);
    setLeq(0);
    setLmax(0);
    setElapsed(0);
    setSaved(false);
    setSaveError('');
    setClassifyError('');
    setClassifyResult(null);
    setAudioFile(null);
    recordedChunksRef.current = [];
    mediaRecorderRef.current = null;
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);

      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

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
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(
    elapsed % 60
  ).padStart(2, '0')}`;

  const standard =
  classifyResult?.legal_standard &&
  typeof classifyResult.legal_standard === 'object' &&
  !Array.isArray(classifyResult.legal_standard)
    ? (classifyResult.legal_standard as { leq?: number; lmax?: number })
    : classifyResult?.standards &&
        typeof classifyResult.standards === 'object' &&
        !Array.isArray(classifyResult.standards)
      ? (classifyResult.standards as { leq?: number; lmax?: number })
      : undefined;

  const primarySource = getPrimarySource();
  const secondarySource = getSecondarySource();
  const detectedNoiseType = getDetectedNoiseType();

  const aiChips = classifyResult
    ? [
        primarySource && `주소음원: ${primarySource}`,
        secondarySource && `부소음원: ${secondarySource}`,
        detectedNoiseType,
        `${limits.label} 기준`,
        `Leq 기준 ${standard?.leq ?? limits.leqLimit}dB`,
        standard?.lmax
          ? `Lmax 기준 ${standard.lmax}dB`
          : limits.lmaxLimit
            ? `Lmax 기준 ${limits.lmaxLimit}dB`
            : 'Lmax 미적용',
      ].filter((chip): chip is string => Boolean(chip))
    : [
        '분류 전',
        measureType === 'impact' ? '직접충격' : '공기전달',
        `${limits.label} 기준`,
      ];

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
              fontFamily: strongFont,
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

        {state !== 'idle' && isOver && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 16px',
              borderRadius: 14,
              background:
                'linear-gradient(135deg, rgba(217,48,37,.92), rgba(185,28,28,.88))',
              color: '#fff',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <AlertTriangle size={18} color="#fff" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800 }}>법적 기준 초과 감지</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>
                Leq {leq} dB — 기준({limits.leqLimit} dB) 초과 +
                {Math.round((leq - limits.leqLimit) * 10) / 10} dB
              </div>
            </div>
          </div>
        )}

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
                fontFamily: strongFont,
                fontSize: 13,
                fontWeight: 800,
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

        <GlassCard style={{ marginTop: 14, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1866', marginBottom: 8 }}>
            AI 소음 분류
          </div>

          <div
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#0A1866',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Mic size={14} color="#0A1866" />
            {classifying
              ? 'AI 소음 분석 중...'
              : state === 'measuring'
                ? '측정 종료 후 녹음본을 자동 분석합니다'
                : classifyResult
                  ? 'AI 소음 분석 완료'
                  : '측정 후 AI가 녹음본을 자동 분석합니다'}
          </div>

          {audioFile && (
            <div style={{ fontSize: 10, color: '#9AA6C0', marginTop: 8 }}>
              녹음 파일: {audioFile.name}
            </div>
          )}

          {classifyError && (
            <div style={{ fontSize: 11, color: '#C0271E', marginTop: 8 }}>
              {classifyError}
            </div>
          )}

          {classifyResult && (
            <div style={{ fontSize: 10, color: '#7A8AB8', marginTop: 8, lineHeight: 1.5 }}>
              분류 결과가 측정 유형과 저장 이력의 주소음원/부소음원에 반영됩니다.
            </div>
          )}
        </GlassCard>

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
                fontFamily: strongFont,
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
                  fontWeight: 800,
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
                  fontWeight: 800,
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
                fontFamily: strongFont,
                fontSize: 14,
                fontWeight: 800,
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
                  fontFamily: strongFont,
                  fontSize: 13,
                  fontWeight: 800,
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
                disabled={saving || saved || classifying}
                style={{
                  flex: 1.4,
                  border: 'none',
                  padding: 16,
                  borderRadius: 999,
                  background: saved
                    ? 'rgba(26,59,219,0.2)'
                    : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                  color: '#fff',
                  cursor: saving || saved || classifying ? 'default' : 'pointer',
                  fontFamily: strongFont,
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: saving || classifying ? 0.7 : 1,
                }}
              >
                {saved ? <CheckCircle size={14} color="#fff" /> : <Save size={14} color="#fff" />}
                {classifying ? 'AI 분석 중...' : saving ? '저장 중...' : saved ? '저장됨 ✓' : '이력 저장'}
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
                  fontFamily: strongFont,
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#0A1866',
                }}
              >
                다시 측정
              </button>

              <button
                onClick={saveMeasure}
                disabled={saving || saved || classifying}
                style={{
                  flex: 1.4,
                  border: 'none',
                  padding: 16,
                  borderRadius: 999,
                  background: saved
                    ? 'rgba(26,59,219,0.2)'
                    : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                  color: '#fff',
                  cursor: saving || saved || classifying ? 'default' : 'pointer',
                  fontFamily: strongFont,
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: saving || classifying ? 0.7 : 1,
                }}
              >
                {saved ? <CheckCircle size={14} color="#fff" /> : <Save size={14} color="#fff" />}
                {saving ? '저장 중...' : saved ? '저장 완료 ✓' : '이력 저장'}
              </button>
            </>
          )}
        </div>

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

        {state !== 'idle' && (
          <GlassCard style={{ marginTop: 16, padding: '6px 20px' }}>
            {[
              { key: '측정 시간', val: timeStr, danger: false },
              {
                key: `Leq (${measureType === 'impact' ? '1분' : '5분'} 평균)`,
                val: `${leq} dB(A)`,
                danger: isLeqOver,
              },
              ...(limits.lmaxLimit !== null
                ? [{ key: 'Lmax (최고값)', val: `${lmax} dB(A)`, danger: isLmaxOver }]
                : [{ key: 'Lmax (최고값)', val: `${lmax} dB(A)`, danger: false }]),
              {
                key: '시간대',
                val: null,
                badge: `${limits.label} ${new Date().toLocaleTimeString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
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
                      fontFamily: strongFont,
                      fontSize: 13,
                      fontWeight: 800,
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
                    fontWeight: 800,
                    background:
                      i === 0
                        ? 'rgba(26,59,219,0.1)'
                        : i === aiChips.length - 1 && isOver
                          ? 'rgba(217,48,37,0.08)'
                          : 'rgba(255,255,255,0.7)',
                    color:
                      i === 0
                        ? '#1A3BDB'
                        : i === aiChips.length - 1 && isOver
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

        {state === 'idle' && (
          <>
          </>
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