import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import { Bell, AlertTriangle, Calendar, Activity, Moon, Mic } from 'lucide-react';
import { apiGetHistory, mapRecord, isNighttime, type HistoryItem } from '../services/api';

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.58)',
      backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
      border: '1px solid rgba(255,255,255,0.88)',
      borderRadius: 24, padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function GlassCardSm({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.55)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      border: '1px solid rgba(255,255,255,0.7)',
      borderRadius: 18, ...style,
    }}>
      {children}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('noise_user') || '{}'); } catch { return {}; }
  })();

  const today = new Date();
  const dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const night = isNighttime();
  const timeLabel = night ? '야간' : '주간';

  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    apiGetHistory()
      .then(records => setHistory(records.map(mapRecord)))
      .catch(() => {}); // 오류 시 빈 이력 유지
  }, []);

  // 최근 7일 통계 계산
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recent = history; // API가 이미 최근순으로 반환
  const recentWeek = recent.filter(i => {
    // measured_at 기반으로 필터하고 싶지만 HistoryItem은 time(문자열)만 있음
    // → 전체 이력 사용 (간소화)
    return true;
  });

  const totalCount = recentWeek.length;
  const overCount = recentWeek.filter(i => i.over).length;
  const avgDb = totalCount > 0
    ? Math.round(recentWeek.reduce((a, i) => a + i.db, 0) / totalCount * 10) / 10
    : 0;
  const nightOverCount = recentWeek.filter(i => i.over && i.period === '야간').length;

  // 최근 측정값 (첫 번째 이력)
  const latest = history[0];

  // 최근 3개만 홈에 표시
  const recentThree = history.slice(0, 3);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#F0F2FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Background />

      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: '#0A1866' }}>
              소음<span style={{ color: '#1A3BDB' }}>ON</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: '#9AA6C0', fontWeight: 600 }}>{dateStr}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, padding: '4px 12px', borderRadius: 999, border: '1px solid #cfd6ea', color: '#7A8AB8' }}>
              {timeLabel}
            </div>
            <div style={{ position: 'relative', fontSize: 18 }}>
              <Bell size={20} color="#7A8AB8" />
              {overCount > 0 && (
                <div style={{ position: 'absolute', top: 1, right: -1, width: 7, height: 7, background: '#D93025', borderRadius: '50%', border: '1.5px solid #F0F2FA' }} />
              )}
            </div>
          </div>
        </div>

        {/* Main Card */}
        <GlassCard style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8C98B8', marginBottom: 8 }}>최근 측정값</div>

          {latest ? (
            <>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 72, lineHeight: 1, color: '#0A1A8C' }}>
                {latest.db}{' '}
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: '#9AA6C0', fontWeight: 500 }}>dB(A)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 10 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 999, fontSize: 11,
                  background: latest.over ? 'rgba(217,48,37,0.12)' : 'rgba(26,59,219,0.08)',
                  color: latest.over ? '#C0271E' : '#1A3BDB',
                  border: `1px solid ${latest.over ? 'rgba(217,48,37,0.25)' : 'rgba(26,59,219,0.15)'}`,
                }}>
                  <div style={{ width: 6, height: 6, background: latest.over ? '#D93025' : '#1A3BDB', borderRadius: '50%' }} />
                  {latest.over
                    ? `기준 초과 (+${Math.round((latest.db - (latest.leq_standard ?? 39)) * 10) / 10} dB)`
                    : '정상 범위'}
                </div>
                <div style={{ fontSize: 11, color: '#9AA6C0' }}>{latest.type} · {latest.period}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                {[
                  { label: 'Leq 평균', val: latest.db, pct: Math.min(latest.db, 100) },
                  { label: 'Lmax 최고', val: latest.lmax, pct: Math.min(latest.lmax, 100) },
                ].map(item => (
                  <div key={item.label} style={{
                    flex: 1, padding: 14, borderRadius: 14,
                    background: 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(12px)',
                  }}>
                    <div style={{ fontSize: 11, color: '#9AA6C0', marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, color: '#0A1A8C' }}>
                      {item.val}{' '}
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: '#9AA6C0' }}>dB</span>
                    </div>
                    <div style={{ height: 6, background: '#e5e9f5', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', borderRadius: 6, background: item.pct > 60 ? 'linear-gradient(90deg, #ff6b6b, #D93025)' : 'linear-gradient(90deg, #4B6EFF, #1A3BDB)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ paddingTop: 12, paddingBottom: 8, fontSize: 13, color: '#9AA6C0', textAlign: 'center' }}>
              아직 측정 이력이 없습니다.
            </div>
          )}
        </GlassCard>

        {/* Weekly Stats */}
        <div style={{ marginTop: 26, marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#8C98B8' }}>누적 통계</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            {
              icon: <AlertTriangle size={16} color="#C0271E" />,
              bg: 'rgba(217,48,37,0.1)',
              label: '초과 횟수',
              val: overCount, valColor: '#C0271E',
              sub: '법적 기준 초과',
            },
            {
              icon: <Calendar size={16} color="#1A3BDB" />,
              bg: 'rgba(26,59,219,0.1)',
              label: '총 측정 횟수',
              val: totalCount, valColor: '#0A1A8C',
              sub: '전체 이력',
            },
            {
              icon: <Activity size={16} color="#1A3BDB" />,
              bg: 'rgba(26,59,219,0.1)',
              label: '평균 소음',
              val: avgDb, valColor: '#0A1A8C',
              sub: 'Leq 평균',
              unit: 'dB',
            },
            {
              icon: <Moon size={16} color="#1A3BDB" />,
              bg: 'rgba(26,59,219,0.1)',
              label: '야간 초과',
              val: nightOverCount, valColor: '#C0271E',
              sub: '야간 기준 초과',
            },
          ].map((stat, i) => (
            <GlassCardSm key={i} style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#9AA6C0', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: stat.valColor, lineHeight: 1 }}>
                {stat.val}
                {'unit' in stat && stat.unit && <span style={{ fontSize: 12, fontWeight: 500, color: '#9AA6C0', marginLeft: 2 }}>{stat.unit}</span>}
              </div>
              <div style={{ fontSize: 10, color: '#9AA6C0', marginTop: 4 }}>{stat.sub}</div>
            </GlassCardSm>
          ))}
        </div>

        {/* Recent History */}
        <div style={{ marginTop: 26, marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#8C98B8' }}>최근 이력</div>
        {recentThree.length > 0 ? (
          <GlassCardSm style={{ padding: '8px 16px' }}>
            {recentThree.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderTop: idx > 0 ? '1px solid rgba(26,59,219,0.06)' : 'none',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: item.over ? '#D93025' : '#1A3BDB' }} />
                <div style={{ fontSize: 11, color: '#9AA6C0', width: 70, flexShrink: 0 }}>{item.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: '#0A1A8C' }}>
                    {item.db} dB(A)
                  </div>
                  <div style={{ fontSize: 10, color: '#9AA6C0', marginTop: 2 }}>
                    {item.type} · Lmax {item.lmax} dB
                  </div>
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  background: item.over ? 'rgba(217,48,37,0.1)' : 'rgba(26,59,219,0.08)',
                  color: item.over ? '#C0271E' : '#1A3BDB',
                }}>
                  {item.over ? '초과' : '정상'}
                </div>
              </div>
            ))}
          </GlassCardSm>
        ) : (
          <GlassCardSm style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#9AA6C0' }}>아직 측정 이력이 없습니다.</div>
            <div style={{ fontSize: 11, color: '#B0B8D0', marginTop: 4 }}>측정을 시작해보세요!</div>
          </GlassCardSm>
        )}

        {/* CTA Button */}
        <button
          onClick={() => navigate('/measure')}
          style={{
            width: '100%', marginTop: 28, padding: '18px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 10px 30px rgba(26,59,219,0.25)',
          }}
        >
          <Mic size={18} color="#fff" />
          즉시 측정 시작
        </button>
      </div>

      <TabBar />
    </div>
  );
}
