import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import {
  User,
  Building,
  Settings,
  LogOut,
  ChevronRight,
  Mic,
  Bell,
  Shield,
  HelpCircle,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { apiGetMe, apiUpdateMe, clearAuth } from '../services/api';

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

type Modal = 'profile' | 'apartment' | 'mic' | null;

function MenuItem({
  icon,
  label,
  sub,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: color ? `${color}15` : 'rgba(26,59,219,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: color || '#0A1866',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>

      <ChevronRight size={16} color="#9AA6C0" />
    </button>
  );
}

interface UserState {
  email: string;
  nickname: string;
  apartment_name: string;
  dong: string;
  ho: string;
  floor: number;
  micOffset: number;
}

export function MyPage() {
  const navigate = useNavigate();

  const [modal, setModal] = useState<Modal>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibDone, setCalibDone] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem('noise_user') || '{}');
    } catch {
      return {};
    }
  })();

  const [user, setUser] = useState<UserState>({
    email: stored.email || '',
    nickname: stored.nickname || '',
    apartment_name: stored.apartment_name || '',
    dong: stored.dong || '',
    ho: stored.ho || '',
    floor: Number(stored.floor) || 0,
    micOffset: Number(stored.micOffset) || 0,
  });

  const [nickname, setNickname] = useState(user.nickname);
  const [apartment, setApartment] = useState(user.apartment_name);
  const [dong, setDong] = useState(user.dong);
  const [ho, setHo] = useState(user.ho);
  const [floor, setFloor] = useState(String(user.floor || ''));

  async function fetchMe() {
    setLoadingUser(true);

    try {
      const me = await apiGetMe();

      const updated: UserState = {
        email: me.email || user.email || '',
        nickname: me.nickname || '',
        apartment_name: me.apartment_name || '',
        dong: me.dong || '',
        ho: me.ho || '',
        floor: Number(me.floor) || 0,
        micOffset: user.micOffset,
      };

      setUser(updated);
      setNickname(updated.nickname);
      setApartment(updated.apartment_name);
      setDong(updated.dong);
      setHo(updated.ho);
      setFloor(String(updated.floor || ''));

      localStorage.setItem('noise_user', JSON.stringify(updated));
    } catch {
      // ?†ÌÅ∞ ÎßåÎ£å ?êÎäî ?úÎ≤Ñ ?§Î•ò ??Í∏∞Ï°¥ Î°úÏª¨ ?∞Ïù¥???†Ï?
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile() {
    try {
      const updatedMe = await apiUpdateMe({
        nickname,
      });

      const updated: UserState = {
        ...user,
        nickname: updatedMe.nickname ?? nickname ?? user.nickname ?? '',
      };

      setUser(updated);
      localStorage.setItem('noise_user', JSON.stringify(updated));
      setModal(null);
    } catch (err) {
      console.error(err);
      alert('?ÑÎ°ú???òÏ†ï ?§Ìå®');
    }
  }

  async function saveApartment() {
    try {
      const updatedMe = await apiUpdateMe({
        apartment_name: apartment,
        dong,
        ho,
        floor: Number(floor) || 0,
      });

      const updated: UserState = {
        ...user,
        apartment_name:
          updatedMe.apartment_name ?? apartment ?? user.apartment_name ?? '',
        dong: updatedMe.dong ?? dong ?? user.dong ?? '',
        ho: updatedMe.ho ?? ho ?? user.ho ?? '',
        floor: Number(updatedMe.floor ?? floor ?? user.floor) || 0,
      };

      setUser(updated);
      localStorage.setItem('noise_user', JSON.stringify(updated));
      setModal(null);
    } catch (err) {
      console.error(err);
      alert('?ÑÌåå???ïÎ≥¥ ?òÏ†ï ?§Ìå®');
    }
  }

  function startCalibration() {
    setCalibrating(true);
    setCalibDone(false);

    setTimeout(() => {
      const offset = Math.round((Math.random() * 4 - 2) * 10) / 10;
      const updated: UserState = { ...user, micOffset: offset };

      setUser(updated);
      localStorage.setItem('noise_user', JSON.stringify(updated));
      setCalibrating(false);
      setCalibDone(true);
    }, 3000);
  }

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(26,59,219,0.12)',
    background: 'rgba(240,242,250,0.6)',
    fontSize: 14,
    color: '#0A1866',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    marginTop: 4,
  };

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
          padding: '20px 20px 100px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#0A1866',
            }}
          >
            ÎßàÏù¥?òÏù¥ÏßÄ
          </div>

          <button
            onClick={fetchMe}
            disabled={loadingUser}
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.88)',
              borderRadius: 12,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loadingUser ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw
              size={15}
              color="#7A8AB8"
              style={{
                animation: loadingUser ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>

        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={26} color="#fff" />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#0A1866',
                }}
              >
                {user.nickname || user.email.split('@')[0] || '?¨Ïö©??}
              </div>

              <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 2 }}>
                {user.email}
              </div>

              {user.apartment_name && (
                <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 2 }}>
                  {user.apartment_name} {user.dong && `${user.dong}??}{' '}
                  {user.ho && `${user.ho}??}
                  {user.floor ? ` ¬∑ ${user.floor}Ï∏? : ''}
                </div>
              )}
            </div>

            <button
              onClick={() => setModal('profile')}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(26,59,219,0.08)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: '#1A3BDB',
              }}
            >
              ?∏Ïßë
            </button>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '4px 20px', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#9AA6C0',
              padding: '12px 0 4px',
            }}
          >
            Í≥ÑÏ†ï ?§Ï†ï
          </div>

          <div style={{ borderBottom: '1px solid rgba(26,59,219,0.06)' }}>
            <MenuItem
              icon={<User size={17} color="#1A3BDB" />}
              label="?ÑÎ°ú??Í¥ÄÎ¶?
              sub="?âÎÑ§??Î≥ÄÍ≤?
              onClick={() => setModal('profile')}
            />
          </div>

          <div style={{ borderBottom: '1px solid rgba(26,59,219,0.06)' }}>
            <MenuItem
              icon={<Building size={17} color="#1A3BDB" />}
              label="?ÑÌåå???ïÎ≥¥"
              sub={user.apartment_name || '?ÑÌåå?∏Î™Ö, ???∏Ïàò, Ï∏µÏàò ?ÖÎ†•'}
              onClick={() => setModal('apartment')}
            />
          </div>

          <MenuItem
            icon={<Bell size={17} color="#1A3BDB" />}
            label="?åÎ¶º ?§Ï†ï"
            sub="Í∏∞Ï? Ï¥àÍ≥º ?åÎ¶º Í¥ÄÎ¶?
            onClick={() => {}}
          />
        </GlassCard>

        <GlassCard style={{ padding: '4px 20px', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#9AA6C0',
              padding: '12px 0 4px',
            }}
          >
            Ï∏°Ï†ï ?§Ï†ï
          </div>

          <div style={{ borderBottom: '1px solid rgba(26,59,219,0.06)' }}>
            <MenuItem
              icon={<Mic size={17} color="#1A3BDB" />}
              label="ÎßàÏù¥??Î≥¥Ï†ï"
              sub={
                user.micOffset !== 0
                  ? `?ÑÏû¨ Î≥¥Ï†ïÍ∞? ${user.micOffset > 0 ? '+' : ''}${
                      user.micOffset
                    } dB`
                  : 'ÎßàÏù¥??Í∞êÎèÑ Ï∫òÎ¶¨Î∏åÎ†à?¥ÏÖò'
              }
              onClick={() => setModal('mic')}
            />
          </div>

          <MenuItem
            icon={<Settings size={17} color="#1A3BDB" />}
            label="Ï∏°Ï†ï Í∏∞Î≥∏Í∞??§Ï†ï"
            sub="?åÏùå ?†Ìòï, Ï∏°Ï†ï ?úÍ∞Ñ Í∏∞Î≥∏Í∞?
            onClick={() => {}}
          />
        </GlassCard>

        <GlassCard style={{ padding: '4px 20px', marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#9AA6C0',
              padding: '12px 0 4px',
            }}
          >
            ?ïÎ≥¥
          </div>

          <div style={{ borderBottom: '1px solid rgba(26,59,219,0.06)' }}>
            <MenuItem
              icon={<Shield size={17} color="#1A3BDB" />}
              label="Í∞úÏù∏?ïÎ≥¥ Ï≤òÎ¶¨Î∞©Ïπ®"
              onClick={() => {}}
            />
          </div>

          <MenuItem
            icon={<HelpCircle size={17} color="#1A3BDB" />}
            label="?ÑÏ?Îß?Î∞?FAQ"
            onClick={() => {}}
          />
        </GlassCard>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 999,
            background: 'rgba(217,48,37,0.08)',
            border: '1px solid rgba(217,48,37,0.15)',
            color: '#C0271E',
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <LogOut size={16} color="#C0271E" />
          Î°úÍ∑∏?ÑÏõÉ
        </button>
      </div>

      <TabBar />

      {modal === 'profile' && (
        <BottomModal title="?ÑÎ°ú??Í¥ÄÎ¶? onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label
                style={{ fontSize: 12, color: '#7A8AB8', fontWeight: 600 }}
              >
                ?âÎÑ§??
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="?âÎÑ§??
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{ fontSize: 12, color: '#7A8AB8', fontWeight: 600 }}
              >
                ?¥Î©î??
              </label>
              <input
                value={user.email}
                disabled
                style={{ ...inputStyle, color: '#9AA6C0' }}
              />
            </div>

            <button
              onClick={saveProfile}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 999,
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              ?Ä?•ÌïòÍ∏?
            </button>
          </div>
        </BottomModal>
      )}

      {modal === 'apartment' && (
        <BottomModal title="?ÑÌåå???ïÎ≥¥" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label
                style={{ fontSize: 12, color: '#7A8AB8', fontWeight: 600 }}
              >
                ?ÑÌåå?∏Î™Ö
              </label>
              <input
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="?? ?òÎ????ÑÌåå??
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12, color: '#7A8AB8', fontWeight: 600 }}
                >
                  ??
                </label>
                <input
                  value={dong}
                  onChange={(e) => setDong(e.target.value)}
                  placeholder="??
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12, color: '#7A8AB8', fontWeight: 600 }}
                >
                  ?∏Ïàò
                </label>
                <input
                  value={ho}
                  onChange={(e) => setHo(e.target.value)}
                  placeholder="??
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label
                style={{ fontSize: 12, color: '#7A8AB8', fontWeight: 600 }}
              >
                Í±∞Ï£º Ï∏µÏàò
              </label>
              <input
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="?? 5"
                style={inputStyle}
              />
            </div>

            <button
              onClick={saveApartment}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 999,
                background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              ?Ä?•ÌïòÍ∏?
            </button>
          </div>
        </BottomModal>
      )}

      {modal === 'mic' && (
        <BottomModal title="ÎßàÏù¥??Î≥¥Ï†ï" onClose={() => setModal(null)}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: calibrating
                  ? 'rgba(26,59,219,0.1)'
                  : 'rgba(255,255,255,0.7)',
                border: `2px solid ${
                  calibrating ? '#1A3BDB' : 'rgba(255,255,255,0.88)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                animation: calibrating ? 'noise-pulse 1s infinite' : 'none',
              }}
            >
              <Volume2
                size={32}
                color={calibrating ? '#1A3BDB' : '#7A8AB8'}
              />
            </div>

            <div
              style={{
                fontSize: 13,
                color: '#7A8AB8',
                lineHeight: 1.6,
                marginBottom: 20,
                whiteSpace: 'pre-line',
              }}
            >
              {calibDone
                ? `Î≥¥Ï†ï ?ÑÎ£å!\nÎ≥¥Ï†ïÍ∞? ${
                    user.micOffset > 0 ? '+' : ''
                  }${user.micOffset} dB\n?§Ïùå Ï∏°Ï†ïÎ∂Ä???êÎèô ?ÅÏö©?©Îãà??`
                : calibrating
                ? '?îÏù¥???∏Ïù¥Ï¶àÎ? Î∂ÑÏÑù Ï§ëÏûÖ?àÎã§...\nÏ°∞Ïö©???òÍ≤Ω?êÏÑú ÏßÑÌñâ?¥Ï£º?∏Ïöî.'
                : 'ÎßàÏù¥??Í∞êÎèÑÎ•?Í∏∞Í∏∞??ÎßûÍ≤å Î≥¥Ï†ï?©Îãà??\nÏ°∞Ïö©??Í≥µÍ∞Ñ?êÏÑú ?úÏûë?òÏÑ∏??'}
            </div>

            {!calibrating && (
              <button
                onClick={startCalibration}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {calibDone ? '?§Ïãú Î≥¥Ï†ï?òÍ∏∞' : 'Î≥¥Ï†ï ?úÏûë'}
              </button>
            )}

            {calibrating && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#1A3BDB',
                      animation: `bounce 1s ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </BottomModal>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes noise-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function BottomModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10,26,140,0.25)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(240,242,250,0.98)',
          borderRadius: '28px 28px 0 0',
          padding: '28px 24px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: '#0A1866',
            }}
          >
            {title}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: 'none',
              borderRadius: 10,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ??
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
