import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Background } from '../components/Background';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { apiLogin, apiGetMe, setToken } from './services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      // 1. 로그인 → access_token 취득
      const loginRes = await apiLogin(email, password);
      setToken(loginRes.access_token);

      // 2. 내 정보 조회 → localStorage에 저장
      try {
        const me = await apiGetMe();
        localStorage.setItem(
          'noise_user',
          JSON.stringify({
            email: me.email,
            nickname: me.nickname,
            apartment_name: me.apartment_name,
            dong: me.dong,
            ho: me.ho,
            floor: me.floor,
          })
        );
      } catch {
        // /auth/me 실패 시 최소 정보만 저장
        localStorage.setItem('noise_user', JSON.stringify({ email }));
      }

      navigate('/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      // 401 → 이메일/비밀번호 오류 메시지
      setError(msg.includes('401') || msg.toLowerCase().includes('이메일') || msg.toLowerCase().includes('비밀번호')
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : msg);
    } finally {
      setLoading(false);
    }
  }

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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 28px',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 64, height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 12px 32px rgba(26,59,219,0.3)',
            }}
          >
            <svg width="32" height="32" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="#fff" stroke="none" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 28, fontWeight: 700,
              color: '#0A1866',
            }}
          >
            소음<span style={{ color: '#1A3BDB' }}>ON</span>
          </div>
          <div style={{ fontSize: 13, color: '#7A8AB8', marginTop: 6 }}>
            층간소음 측정 &amp; 증거 수집 앱
          </div>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleLogin}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: 28,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1866', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>
            로그인
          </div>

          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Mail size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '14px 14px 14px 42px',
                borderRadius: 14,
                border: '1px solid rgba(26,59,219,0.12)',
                background: 'rgba(240,242,250,0.6)',
                fontSize: 14, color: '#0A1866',
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Lock size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '14px 44px 14px 42px',
                borderRadius: 14,
                border: '1px solid rgba(26,59,219,0.12)',
                background: 'rgba(240,242,250,0.6)',
                fontSize: 14, color: '#0A1866',
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showPw ? <EyeOff size={16} color="#7A8AB8" /> : <Eye size={16} color="#7A8AB8" />}
            </button>
          </div>

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
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#7A8AB8' }}>아직 계정이 없으신가요? </span>
          <button
            onClick={() => navigate('/register')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A3BDB', fontSize: 13, fontWeight: 600, padding: 0 }}
          >
            회원가입
          </button>
        </div>

        {/* 개발 모드 토글 */}
        <div
          onClick={() => {
            const newMode = !devMode;
            setDevModeState(newMode);
            setDevMode(newMode);
          }}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: 14,
            background: devMode ? 'rgba(26,59,219,0.1)' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${devMode ? 'rgba(26,59,219,0.3)' : 'rgba(26,59,219,0.1)'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <Code size={14} color={devMode ? '#1A3BDB' : '#7A8AB8'} />
          <span style={{ fontSize: 11, fontWeight: 600, color: devMode ? '#1A3BDB' : '#7A8AB8' }}>
            개발 모드 {devMode ? 'ON' : 'OFF'}
          </span>
        </div>

        {devMode && (
          <div style={{
            marginTop: 8,
            fontSize: 10,
            color: '#7A8AB8',
            textAlign: 'center',
            lineHeight: 1.4,
            maxWidth: 280,
          }}>
            서버 없이 작동합니다. 아무 이메일/비밀번호(6자 이상)로 로그인 가능
          </div>
        )}
      </div>
    </div>
  );
}
