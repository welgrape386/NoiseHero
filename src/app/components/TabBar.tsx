import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Mic, FileText, MessageCircle, User } from 'lucide-react';

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/home', label: '홈', icon: Home },
    { path: '/measure', label: '측정', icon: Mic },
    { path: '/report', label: '리포트', icon: FileText },
    { path: '/chatbot', label: '상담', icon: MessageCircle },
    { path: '/mypage', label: '마이', icon: User },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px 18px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          height: 68,
          borderRadius: 24,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 16px 40px rgba(10,24,102,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          pointerEvents: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            location.pathname === tab.path ||
            (tab.path === '/home' && location.pathname === '/');

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                height: '100%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                color: active ? '#1A3BDB' : '#9AA6C0',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}