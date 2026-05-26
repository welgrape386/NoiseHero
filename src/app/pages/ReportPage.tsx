import { useState, useEffect } from 'react';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  API_BASE_URL,
  apiCreateReportPdf,
  apiGetHistory,
  apiGetMe,
  apiGenerateReport,
  mapRecord,
  type HistoryItem,
  type UserMe,
  type GeneratedReport,
} from '../services/api';

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

export function ReportPage() {
  const [filter, setFilter] = useState<'all' | 'over' | 'ok'>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserMe | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetLocation, setTargetLocation] = useState('윗집');
  const [targetAddress, setTargetAddress] = useState('');

  const [report, setReport] = useState<GeneratedReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [reportError, setReportError] = useState('');

  async function loadPageData() {
    setLoading(true);
    setFetchError('');

    try {
      const [me, records] = await Promise.all([apiGetMe(), apiGetHistory()]);
      setUserInfo(me);
      setHistory(records.map(mapRecord));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : '정보를 불러오지 못했습니다.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  }

  async function handleGenerateReport() {
    if (!userInfo) {
      setReportError('신청인 정보를 불러오지 못했습니다.');
      return;
    }

    if (!targetAddress.trim()) {
      setReportError('상대세대 동·호수를 입력해 주세요.');
      return;
    }

    const selectedRecords = history
      .filter(item => selectedIds.includes(item.id))
      .map(item => ({
        measured_at: item.time,
        noise_type: item.type,
        time_zone: item.period,
        primary_source: item.primary_source,
        secondary_source: item.secondary_source,
        leq: item.db,
        lmax: item.lmax,
        leq_standard: item.leq_standard ?? 0,
        lmax_standard: item.lmax_standard ?? null,
        is_exceeded: item.over,
      }));

    if (selectedRecords.length === 0) {
      setReportError('민원서에 넣을 측정 이력을 선택해 주세요.');
      return;
    }

    setGenerating(true);
    setReportError('');
    setReport(null);

    try {
      const res = await apiGenerateReport({
        user_info: userInfo,
        target_info: {
          location: targetLocation,
          address: targetAddress,
        },
        selected_records: selectedRecords,
      });

      setReport(res.data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : '민원서 생성에 실패했습니다.';
      setReportError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      const res = await apiCreateReportPdf();

      // 백엔드가 pdf_url 문자열을 주는 경우
      if (typeof res === 'string') {
        window.open(`${API_BASE_URL}${res}`, '_blank');
        return;
      }

      alert('PDF가 생성되었습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF 생성에 실패했습니다.';
      alert(msg);
    }
  }

  const filtered = history.filter(item => {
    if (filter === 'over') return item.over;
    if (filter === 'ok') return !item.over;
    return true;
  });

  const overCount = history.filter(i => i.over).length;
  const avgDb =
    history.length > 0
      ? Math.round(
          (history.reduce((a, i) => a + i.db, 0) / history.length) * 10
        ) / 10
      : 0;

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
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#0A1866',
              }}
            >
              민원서 생성
            </div>
            <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 4 }}>
              측정 이력을 선택해 층간소음 민원서 초안을 생성합니다.
            </div>
          </div>

          <button
            onClick={loadPageData}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.88)',
              borderRadius: 12,
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw
              size={16}
              color="#7A8AB8"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            />
          </button>
        </div>

        {fetchError && (
          <div
            style={{
              marginBottom: 16,
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
            {fetchError}
          </div>
        )}

        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#0A1866',
              marginBottom: 12,
            }}
          >
            신청인 및 건물 정보
          </div>

          {userInfo ? (
            <div style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.8 }}>
              <div>
                {userInfo.nickname || userInfo.email} ·{' '}
                {userInfo.apartment_name || '아파트 미입력'}
              </div>
              <div>
                {userInfo.dong || '-'}동 {userInfo.ho || '-'}호 ·{' '}
                {userInfo.floor ?? '-'}층
              </div>
              <div>
                건설사: {userInfo.building_company || '미입력'} / 구조:{' '}
                {userInfo.structure || '미입력'}
              </div>
              <div>
                슬라브 두께: {userInfo.slab_thickness || '미입력'} / 관리사무소:{' '}
                {userInfo.management_office || '미입력'}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#C0271E' }}>
              신청인 정보를 불러오지 못했습니다.
            </div>
          )}
        </GlassCard>

        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#0A1866',
              marginBottom: 12,
            }}
          >
            상대세대 정보
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['윗집', '아래집', '옆집'].map(loc => (
              <button
                key={loc}
                onClick={() => setTargetLocation(loc)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 999,
                  border: 'none',
                  background:
                    targetLocation === loc
                      ? '#1A3BDB'
                      : 'rgba(255,255,255,0.7)',
                  color: targetLocation === loc ? '#fff' : '#7A8AB8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {loc}
              </button>
            ))}
          </div>

          <input
            value={targetAddress}
            onChange={e => setTargetAddress(e.target.value)}
            placeholder="예: 101동 602호"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '13px 15px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.88)',
              background: 'rgba(255,255,255,0.75)',
              outline: 'none',
              fontSize: 13,
              color: '#0A1866',
            }}
          />
        </GlassCard>

        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#8C98B8',
              marginBottom: 14,
            }}
          >
            전체 요약
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: '총 측정', val: history.length, unit: '회', color: '#0A1A8C' },
              { label: '기준 초과', val: overCount, unit: '회', color: '#C0271E' },
              { label: '평균 소음', val: avgDb, unit: 'dB', color: '#0A1A8C' },
            ].map(stat => (
              <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 32,
                    color: stat.color,
                    lineHeight: 1,
                  }}
                >
                  {stat.val}
                </div>
                <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 2 }}>
                  {stat.unit} · {stat.label}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { key: 'all', label: '전체' },
            { key: 'over', label: '초과만' },
            { key: 'ok', label: '정상만' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as 'all' | 'over' | 'ok')}
              style={{
                padding: '6px 16px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: filter === f.key ? '#1A3BDB' : 'rgba(255,255,255,0.6)',
                color: filter === f.key ? '#fff' : '#7A8AB8',
                backdropFilter: 'blur(8px)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: '#9AA6C0',
              fontSize: 13,
            }}
          >
            이력을 불러오는 중...
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(item => {
              const checked = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  style={{
                    background: checked
                      ? 'rgba(26,59,219,0.08)'
                      : 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(18px)',
                    border: checked
                      ? '1px solid rgba(26,59,219,0.35)'
                      : '1px solid rgba(255,255,255,0.7)',
                    borderRadius: 18,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 8,
                      border: checked
                        ? 'none'
                        : '1px solid rgba(122,138,184,0.4)',
                      background: checked ? '#1A3BDB' : 'rgba(255,255,255,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {checked && <CheckCircle size={14} color="#fff" />}
                  </div>

                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: item.over ? '#D93025' : '#1A3BDB',
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#0A1866',
                        }}
                      >
                        {item.db} dB(A)
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: item.over
                            ? 'rgba(217,48,37,0.1)'
                            : 'rgba(26,59,219,0.08)',
                          color: item.over ? '#C0271E' : '#1A3BDB',
                        }}
                      >
                        {item.over ? '초과' : '정상'}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: '#9AA6C0' }}>
                      {item.time} · {item.type} · {item.period} · Lmax{' '}
                      {item.lmax} dB
                    </div>

                    {(item.primary_source || item.secondary_source) && (
                      <div style={{ fontSize: 10, color: '#7A8AB8', marginTop: 4 }}>
                        주소음원: {item.primary_source || '미분류'} / 부소음원:{' '}
                        {item.secondary_source || '없음'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !fetchError && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: '#9AA6C0',
                  fontSize: 13,
                }}
              >
                {history.length === 0
                  ? '아직 측정 이력이 없습니다.'
                  : '해당하는 측정 이력이 없습니다.'}
              </div>
            )}
          </div>
        )}

        {reportError && (
          <div
            style={{
              marginTop: 16,
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
            {reportError}
          </div>
        )}

        <button
          onClick={handleGenerateReport}
          disabled={generating}
          style={{
            width: '100%',
            marginTop: 18,
            padding: '15px',
            borderRadius: 18,
            border: 'none',
            background: generating
              ? 'rgba(26,59,219,0.25)'
              : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: generating ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <FileText size={16} color="#fff" />
          {generating ? '민원서 생성 중...' : `민원서 생성하기 (${selectedIds.length}개 선택)`}
        </button>

        {report && (
          <GlassCard style={{ padding: 22, marginTop: 22 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#0A1866',
                marginBottom: 12,
              }}
            >
              {report.title}
            </div>

            <div style={{ fontSize: 11, color: '#9AA6C0', marginBottom: 18 }}>
              작성일: {report.created_at}
            </div>

            <ReportSection title="신청인 정보">
              <Line label="이름" value={report.applicant.nickname} />
              <Line label="아파트" value={report.applicant.apartment_name} />
              <Line
                label="동·호수"
                value={`${report.applicant.dong || '-'}동 ${report.applicant.ho || '-'}호`}
              />
              <Line label="관리사무소 연락처" value={report.applicant.management_phone} />
            </ReportSection>

            <ReportSection title="상대세대 정보">
              <Line label="주거위치" value={report.target.location} />
              <Line label="상세주소" value={report.target.address} />
            </ReportSection>

            <ReportSection title="건물 정보">
              <Line label="건설사" value={report.building.building_company} />
              <Line label="슬라브 두께" value={report.building.slab_thickness} />
              <Line label="구조" value={report.building.structure} />
              <Line label="층간소음 위원회" value={report.building.committee} />
              <Line label="관리사무소" value={report.building.management_office} />
            </ReportSection>

            <ReportSection title="소음 측정 이력">
              {report.noise_records.map((r, idx) => (
                <div
                  key={`${r.measured_at}-${idx}`}
                  style={{
                    padding: '10px 0',
                    borderBottom:
                      idx === report.noise_records.length - 1
                        ? 'none'
                        : '1px solid rgba(122,138,184,0.18)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1866' }}>
                    {idx + 1}. {r.measured_at} ({r.time_zone})
                  </div>
                  <div style={{ fontSize: 11, color: '#7A8AB8', marginTop: 4 }}>
                    {r.noise_type} · Leq {r.leq}dB / Lmax {r.lmax}dB
                  </div>
                  <div style={{ fontSize: 11, color: '#7A8AB8', marginTop: 2 }}>
                    기준: Leq {r.leq_standard}dB / Lmax {r.lmax_standard ?? '미적용'}
                  </div>
                  <div style={{ fontSize: 11, color: '#C0271E', marginTop: 2 }}>
                    초과: Leq +{r.leq_exceeded ?? 0}dB / Lmax +{r.lmax_exceeded ?? 0}dB
                  </div>
                  <div style={{ fontSize: 11, color: '#7A8AB8', marginTop: 2 }}>
                    주소음원: {r.primary_source || '미분류'} / 부소음원:{' '}
                    {r.secondary_source || '없음'}
                  </div>
                </div>
              ))}
            </ReportSection>

            <ReportSection title="피해 내용">
              <p style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.7, margin: 0 }}>
                {report.damage_summary}
              </p>
            </ReportSection>

            <ReportSection title="결론">
              <p style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.7 }}>
                1. {report.conclusion.site_inspection}
              </p>
              <p style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.7 }}>
                2. {report.conclusion.noise_measurement}
              </p>
              <p style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.7 }}>
                3. {report.conclusion.prevention}
              </p>
            </ReportSection>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 14,
                background: 'rgba(26,59,219,0.06)',
                fontSize: 11,
                color: '#7A8AB8',
                lineHeight: 1.6,
              }}
            >
              {report.disclaimer}
            </div>

            <button
              onClick={handleDownloadPdf}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '14px',
                borderRadius: 16,
                border: 'none',
                background: '#0A1866',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Download size={15} color="#fff" />
              PDF로 저장하기
            </button>
          </GlassCard>
        )}
      </div>

      <TabBar />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media print {
          body * {
            visibility: hidden;
          }
        }
      `}</style>
    </div>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#0A1866',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value?: string | number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 12,
        color: '#7A8AB8',
        padding: '3px 0',
      }}
    >
      <span>{label}</span>
      <strong style={{ color: '#0A1866', textAlign: 'right' }}>
        {value || '미입력'}
      </strong>
    </div>
  );
}