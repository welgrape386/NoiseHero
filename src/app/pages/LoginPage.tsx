import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { apiLogin, apiGetMe, setToken } from '../services/api';

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
      const loginRes = await apiLogin(email, password);
      setToken(loginRes.access_token);

      try {
        const me = await apiGetMe();
        localStorage.setItem('noise_user', JSON.stringify(me));
      } catch {
        localStorage.setItem('noise_user', JSON.stringify({ email }));
      }

      navigate('/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(
        msg.includes('401') ||
          msg.includes('이메일') ||
          msg.includes('비밀번호')
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  const inputWrap: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    marginBottom: 14,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 44px',
    borderRadius: 14,
    border: '1px solid rgba(26,59,219,0.14)',
    background: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    color: '#0A1866',
    outline: 'none',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F0F2FA 0%, #E8ECFF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: 28,
          padding: 28,
          boxShadow: '0 20px 60px rgba(26,59,219,0.12)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#fff',
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            ON
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0A1866' }}>
            소음ON 로그인
          </div>
          <div style={{ fontSize: 13, color: '#7A8AB8', marginTop: 8 }}>
            계정으로 로그인해 서비스를 이용하세요
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={inputWrap}>
            <Mail
              size={18}
              color="#7A8AB8"
              style={{ position: 'absolute', left: 15, top: 15 }}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              style={inputStyle}
            />
          </div>

          <div style={inputWrap}>
            <Lock
              size={18}
              color="#7A8AB8"
              style={{ position: 'absolute', left: 15, top: 15 }}
            />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: 'absolute',
                right: 12,
                top: 10,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              {showPw ? (
                <EyeOff size={18} color="#7A8AB8" />
              ) : (
                <Eye size={18} color="#7A8AB8" />
              )}
            </button>
          </div>

          {error && (
            <div
              style={{
                fontSize: 13,
                color: '#D93025',
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 15,
              borderRadius: 999,
              border: 'none',
              background: loading
                ? '#9AA6C0'
                : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <button
          onClick={() => navigate('/register')}
          style={{
            width: '100%',
            marginTop: 16,
            border: 'none',
            background: 'transparent',
            color: '#1A3BDB',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          계정이 없나요? 회원가입
        </button>
      </div>
    </div>
  );
}