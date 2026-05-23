import { Home, Mic, FileText, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/home', label: '홈', icon: Home },
    { path: '/measure', label: '측정', icon: Mic },
    { path: '/report', label: '리포트', icon: FileText },
    { path: '/chatbot', label: '챗봇', icon: MessageCircle },
    { path: '/mypage', label: '마이', icon: User },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        height: 68,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.9)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 50,
        boxShadow: '0 12px 36px rgba(26,59,219,0.14)',
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        const Icon = tab.icon;

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: active ? '#1A3BDB' : '#9AA6C0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: active ? 700 : 500,
            }}
          >
            <Icon size={20} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}