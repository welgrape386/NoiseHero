import { useNavigate, useLocation } from 'react-router';
import { Home, Mic, BarChart2, MessageCircle, User } from 'lucide-react';

const tabs = [
  { id: 'home', label: '홈', icon: Home, path: '/home' },
  { id: 'measure', label: '측정', icon: Mic, path: '/measure' },
  { id: 'report', label: '이력', icon: BarChart2, path: '/report' },
  { id: 'chatbot', label: 'AI상담', icon: MessageCircle, path: '/chatbot' },
  { id: 'mypage', label: '마이', icon: User, path: '/mypage' },
];

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 80,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 -4px 20px rgba(10,26,140,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px 10px',
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path || 
          (location.pathname === '/' && tab.id === 'home');
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              borderRadius: 14,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Icon
              size={22}
              color={active ? '#1A3BDB' : '#7A8AB8'}
              strokeWidth={active ? 2.2 : 1.8}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: active ? '#1A3BDB' : '#7A8AB8',
                letterSpacing: '0.02em',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
