import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '../components/Background';
import { Eye, EyeOff, Lock, Mail, User, Building, ChevronLeft } from 'lucide-react';
import { apiSignup, apiLogin, apiGetMe, setToken } from '../services/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Step 2
  const [nickname, setNickname] = useState('');
  const [apartmentName, setApartmentName] = useState('');
  const [dong, setDong] = useState('');
  const [ho, setHo] = useState('');
  const [floor, setFloor] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email) return setError('?´ë©”?¼ì„ ?…ë ¥?´ì£¼?¸ìš”.');
    if (!email.includes('@')) return setError('?¬ë°”ë¥??´ë©”???•ì‹???„ë‹™?ˆë‹¤.');
    if (!password || password.length < 6) return setError('ë¹„ë?ë²ˆí˜¸??6???´ìƒ?´ì–´???©ë‹ˆ??');
    if (password !== pwConfirm) return setError('ë¹„ë?ë²ˆí˜¸ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤.');
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nickname) return setError('?‰ë„¤?„ì„ ?…ë ¥?´ì£¼?¸ìš”.');

    setLoading(true);
    try {
      // 1. ?Œì›ê°€??API ?¸ì¶œ
      await apiSignup({
        email,
        password,
        nickname,
        ...(apartmentName && { apartment_name: apartmentName }),
        ...(dong && { dong }),
        ...(ho && { ho }),
        ...(floor && !isNaN(Number(floor)) && { floor: Number(floor) }),
      });

      // 2. ?ë™ ë¡œê·¸????access_token ì·¨ë“
      const loginRes = await apiLogin(email, password);
      setToken(loginRes.access_token);

      // 3. ???•ë³´ ?€??
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
        localStorage.setItem('noise_user', JSON.stringify({ email, nickname }));
      }

      navigate('/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '?Œì›ê°€?…ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.';
      setError(msg.includes('?´ë?') ? '?´ë? ?¬ìš© ì¤‘ì¸ ?´ë©”?¼ì…?ˆë‹¤.' : msg);
    } finally {
      setLoading(false);
    }
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

  const inputNoIconStyle: React.CSSProperties = {
    ...inputStyle,
    padding: '14px',
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
          overflowY: 'auto',
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
            ?ŒìŒ<span style={{ color: '#1A3BDB' }}>ON</span> ?Œì›ê°€??
          </div>
          <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 4 }}>
            {step === 1 ? 'ê³„ì • ?•ë³´ë¥??…ë ¥?´ì£¼?¸ìš”' : '?„ë¡œ???•ë³´ë¥??¤ì •?´ì£¼?¸ìš”'}
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
                ê³„ì • ?•ë³´
              </div>

              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="email" placeholder="?´ë©”??ì£¼ì†Œ" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type={showPw ? 'text' : 'password'} placeholder="ë¹„ë?ë²ˆí˜¸ (6???´ìƒ)" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw ? <EyeOff size={16} color="#7A8AB8" /> : <Eye size={16} color="#7A8AB8" />}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="password" placeholder="ë¹„ë?ë²ˆí˜¸ ?•ì¸" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} style={inputStyle} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1866', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>
                ?„ë¡œ???•ë³´
              </div>

              {/* ?‰ë„¤??(?„ìˆ˜) */}
              <div style={{ position: 'relative' }}>
                <User size={16} color="#7A8AB8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder="?‰ë„¤??*" value={nickname} onChange={e => setNickname(e.target.value)} style={inputStyle} />
              </div>

              {/* ?„íŒŒ???•ë³´ (? íƒ) */}
              <div style={{
                padding: '14px 16px 10px',
                borderRadius: 14,
                background: 'rgba(26,59,219,0.04)',
                border: '1px solid rgba(26,59,219,0.08)',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Building size={14} color="#7A8AB8" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#7A8AB8' }}>?„íŒŒ???•ë³´ (? íƒ)</span>
                </div>

                <input
                  type="text"
                  placeholder="?„íŒŒ?¸ëª… (?? ?˜ë????„íŒŒ??"
                  value={apartmentName}
                  onChange={e => setApartmentName(e.target.value)}
                  style={inputNoIconStyle}
                />

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="??
                    value={dong}
                    onChange={e => setDong(e.target.value)}
                    style={{ ...inputNoIconStyle, flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="?¸ìˆ˜"
                    value={ho}
                    onChange={e => setHo(e.target.value)}
                    style={{ ...inputNoIconStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    placeholder="ì¸µìˆ˜"
                    value={floor}
                    onChange={e => setFloor(e.target.value)}
                    style={{ ...inputNoIconStyle, flex: 1 }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#7A8AB8', padding: '2px 4px' }}>
                ?„íŒŒ???•ë³´??ë§ˆì´?˜ì´ì§€?ì„œ???˜ì •?????ˆìŠµ?ˆë‹¤.
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
            {loading ? 'ì²˜ë¦¬ ì¤?..' : step === 1 ? '?¤ìŒ ?¨ê³„' : '?Œì›ê°€???„ë£Œ'}
          </button>
        </form>

        {step === 1 && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#7A8AB8' }}>?´ë? ê³„ì •???ˆìœ¼? ê??? </span>
            <button
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A3BDB', fontSize: 13, fontWeight: 600, padding: 0 }}
            >
              ë¡œê·¸??
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
