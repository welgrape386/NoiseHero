import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Background } from '../components/Background';
import { Eye, EyeOff, Lock, Mail, User, ChevronLeft } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email) return setError('이메일을 입력해주세요.');
    if (!email.includes('@')) return setError('올바른 이메일 형식이 아닙니다.');
    if (!password || password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다.');
    if (password !== pwConfirm) return setError('비밀번호가 일치하지 않습니다.');
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nickname) return setError('닉네임을 입력해주세요.');
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('noise_user', JSON.stringify({ email, nickname }));
      setLoading(false);
      navigate('/home');
    }, 900);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '14px 14px 14px 42px',
    borderRadius: 14,
    border: '1px solid rgba(26,59,219,0.12)',
    background: 'rgba(240,242,250,0.6)',
    fontSize: 14, color: '#0A1866',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%', height: '100vh',
        background: '#F0F2FA',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <Background />
      <div
        style={{
          position: 'relative', zIndex: 2, flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 28px',
        }}
      >
        {/* Back button */}
        <div style={{ width: '100%', marginBottom: 24 }}>
          <button
            onClick={() => step === 1 ? navigate('/login') : setStep(1)}
            style={{
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.88)',
              borderRadius: 12, width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} color="#0A1866" />
          </button>
        </div>

        {/* Logo small */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, fontWeight: 700, color: '#0A1866',
          }}>
            소음<span style={{ color: '#1A3BDB' }}>ON</span> 회원가입
          </div>
          <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 4 }}>
            {step === 1 ? '계정 정보를 입력해주세요' : '프로필 정보를 설정해주세요'}
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                width: s === step ? 24 : 8, height: 8,
                borderRadius: 999,
                background: s <= step ? '#1A3BDB' : 'rgba(26,59,219,0.15)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        <form
          onSubmit={step === 1 ? handleStep1 : handleStep2}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 28,
            padding: '28px 24px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}
        >
          {step === 1 ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1866', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>
                계정 정보
              </div>

              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="email" placeholder="이메일 주소" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type={showPw ? 'text' : 'password'} placeholder="비밀번호 (6자 이상)" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw ? <EyeOff size={16} color="#7A8AB8" /> : <Eye size={16} color="#7A8AB8" />}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="password" placeholder="비밀번호 확인" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} style={inputStyle} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1866', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>
                프로필 정보
              </div>

              <div style={{ position: 'relative' }}>
                <User size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder="닉네임" value={nickname} onChange={e => setNickname(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ fontSize: 11, color: '#7A8AB8', padding: '2px 4px' }}>
                아파트 정보는 마이페이지에서 설정할 수 있습니다.
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, color: '#C0271E', background: 'rgba(217,48,37,0.08)', padding: '8px 12px', borderRadius: 10 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px',
              borderRadius: 999,
              background: loading ? 'rgba(26,59,219,0.5)' : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
              color: '#fff', border: 'none', cursor: loading ? 'wait' : 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 15, fontWeight: 600,
              boxShadow: '0 8px 24px rgba(26,59,219,0.25)',
              marginTop: 4,
            }}
          >
            {loading ? '처리 중...' : step === 1 ? '다음 단계' : '회원가입 완료'}
          </button>
        </form>

        {step === 1 && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#7A8AB8' }}>이미 계정이 있으신가요? </span>
            <button
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A3BDB', fontSize: 13, fontWeight: 600, padding: 0 }}
            >
              로그인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
