import { useState, useEffect } from 'react';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ClipboardList,
  Building2,
} from 'lucide-react';
import {
  apiGetHistory,
  apiGetMe,
  apiCreateReportPdf,
  mapRecord,
  type HistoryItem,
  type UserMe,
  type ReportType,
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

function isValidSource(value?: string | string[]): boolean {
  if (!value) return false;

  if (Array.isArray(value)) {
    return value.some(v => isValidSource(v));
  }

  const trimmed = value.trim();

  return (
    trimmed !== '' &&
    trimmed !== '분류 안 됨' &&
    trimmed !== '미분류' &&
    trimmed !== '없음' &&
    trimmed !== 'undefined' &&
    trimmed !== 'null'
  );
}

export function ReportPage() {
  const [filter, setFilter] = useState<'all' | 'over' | 'ok'>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserMe | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetHo, setTargetHo] = useState('');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingManagement, setGeneratingManagement] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [reportError, setReportError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [managementPdfUrl, setManagementPdfUrl] = useState('');
  const [showVisitGuide, setShowVisitGuide] = useState(false);

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

  async function generateReport(reportType: ReportType) {
    const isManagement = reportType === 'management_office';

    if (!userInfo) {
      setReportError('신청인 정보를 불러오지 못했습니다.');
      return;
    }

    if (!targetHo.trim()) {
      setReportError('소음추정 세대의 호수를 입력해 주세요.');
      return;
    }

    if (selectedIds.length === 0) {
      setReportError('민원서에 넣을 측정 이력을 선택해 주세요.');
      return;
    }

    if (isManagement) {
      setGeneratingManagement(true);
      setManagementPdfUrl('');
    } else {
      setGenerating(true);
      setPdfUrl('');
    }
    setReportError('');

    try {
      const selectedRecords = history.filter(item => selectedIds.includes(item.id));

      const exceededCount = selectedRecords.filter(r => r.over).length;

      const blob = await apiCreateReportPdf({
        report_type: reportType,
        title: isManagement
          ? '층간소음 피해 관리사무소 민원서'
          : '층간소음 피해 현장진단 신청서',
        created_at: new Date().toISOString().slice(0, 10),

        applicant: {
          nickname: userInfo.nickname || '',
          apartment_name: userInfo.apartment_name || '',
          dong: userInfo.dong || '',
          ho: userInfo.ho || '',
          floor: String(userInfo.floor ?? ''),
          management_phone: userInfo.management_phone || '',
        },

        target: {
          location: '',
          address: `${userInfo.dong || ''}동 ${targetHo}호`,
        },

        noise_records: selectedRecords.map(item => ({
          measured_at: item.measured_at || '',
          time_zone: item.period,
          noise_type: item.type,
          primary_source: item.primary_source || '',
          secondary_source: Array.isArray(item.secondary_source)
            ? item.secondary_source
            : (item.secondary_source
                ? String(item.secondary_source).split(',').map(s => s.trim()).filter(Boolean)
                : []),
          leq: item.db,
          lmax: item.lmax,
          leq_standard: item.leq_standard || 0,
          lmax_standard: item.lmax_standard || 0,
          leq_exceeded: item.db - (item.leq_standard || 0),
          lmax_exceeded: item.lmax - (item.lmax_standard || 0),
        })),

        statistics: {
          total_count: selectedRecords.length,
          exceeded_count: exceededCount,
          exceed_rate: selectedRecords.length ? Number(((exceededCount / selectedRecords.length) * 100).toFixed(1)) : 0,
          avg_leq: selectedRecords.length ? Number((selectedRecords.reduce((a, b) => a + b.db, 0) / selectedRecords.length).toFixed(1)) : 0,
          avg_lmax: selectedRecords.length ? Number((selectedRecords.reduce((a, b) => a + b.lmax, 0) / selectedRecords.length).toFixed(1)) : 0,
          max_leq: Math.max(...selectedRecords.map(r => r.db)),
          max_leq_at: [...selectedRecords].sort((a,b)=>b.db-a.db)[0]?.measured_at || '',
          max_lmax: Math.max(...selectedRecords.map(r => r.lmax)),
          max_lmax_at: [...selectedRecords].sort((a,b)=>b.lmax-a.lmax)[0]?.measured_at || '',
          daytime_count: selectedRecords.filter(r => r.period === '주간').length,
          nighttime_count: selectedRecords.filter(r => r.period === '야간').length,
        },

        damage_summary: `피해기간: 약 ${selectedRecords.length}일`,

        conclusion: isManagement
          ? {
              site_inspection: `${userInfo.apartment_name || ''} ${userInfo.dong || ''}동 ${userInfo.ho || ''}호의 피해 세대에 대한 관리사무소 차원의 사실 확인을 요청합니다.`,
              noise_measurement: '관리사무소 입회 하에 소음 측정을 요청합니다.',
              prevention: '상대 세대에 대한 안내 및 재발 방지 조치를 요청합니다.',
            }
          : {
              site_inspection: `${userInfo.apartment_name || ''} ${userInfo.dong || ''}동 ${userInfo.ho || ''}호의 피해 세대에 대한 현장 진단을 요청합니다.`,
              noise_measurement: '주간 및 야간의 소음 측정을 요청합니다.',
              prevention: '상대 세대에 대한 경고 조치와 재발 방지 방안을 마련해 주실 것을 요청합니다.',
            },

        disclaimer: '※ 본 문서는 참고용이며 법적 효력을 보장하지 않습니다.'
      } as any);

      const url = window.URL.createObjectURL(blob);

      if (isManagement) {
        setManagementPdfUrl(url);
      } else {
        setPdfUrl(url);
      }
      window.open(url, '_blank');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : '민원서 생성에 실패했습니다.';
      setReportError(msg);
    } finally {
      if (isManagement) {
        setGeneratingManagement(false);
      } else {
        setGenerating(false);
      }
    }
  }

  function handleGenerateReport() {
    generateReport('neighbor_center');
  }

  function handleGenerateManagementReport() {
    generateReport('management_office');
  }

  function handleDownloadPdf() {
    if (!pdfUrl) {
      alert('먼저 민원서를 생성해 주세요.');
      return;
    }

    window.open(pdfUrl, '_blank');
  }

  function handleDownloadManagementPdf() {
    if (!managementPdfUrl) {
      alert('먼저 관리사무소용 민원서를 생성해 주세요.');
      return;
    }

    window.open(managementPdfUrl, '_blank');
  }

  function handleShowVisitConsultGuide() {
    setShowVisitGuide(true);
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
            <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 4, fontWeight: 500 }}>
              측정 이력을 선택해 층간소음 민원서 PDF를 생성합니다.
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

        {fetchError && <ErrorBox message={fetchError} />}

        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <SectionTitle>신청인 및 건물 정보</SectionTitle>

          {userInfo ? (
            <div style={{ fontSize: 12, color: '#7A8AB8', lineHeight: 1.8, fontWeight: 500 }}>
              <div>
                {userInfo.nickname || userInfo.email} ·{' '}
                {userInfo.apartment_name || '아파트 미입력'}
              </div>

              <div>
                {userInfo.dong || '-'}동 {userInfo.ho || '-'}호 ·{' '}
                {userInfo.floor ?? '-'}층
              </div>

              <div>
                관리사무소: {userInfo.management_office || '미입력'}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#C0271E', fontWeight: 500 }}>
              신청인 정보를 불러오지 못했습니다.
            </div>
          )}
        </GlassCard>

        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <SectionTitle>소음추정 세대 정보</SectionTitle>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <div
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 32px 13px 15px',
                  borderRadius: 16,
                  border: '1.5px solid rgba(26,59,219,0.15)',
                  background: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#7A8AB8',
                }}
              >
                {userInfo?.dong || '-'}
              </div>
              <span
                style={{
                  position: 'absolute',
                  right: 15,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#9AA6C0',
                  pointerEvents: 'none',
                }}
              >
                동
              </span>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={targetHo}
                onChange={e => setTargetHo(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 602"
                inputMode="numeric"
                pattern="[0-9]*"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 32px 13px 15px',
                  borderRadius: 16,
                  border: '2px solid rgba(26,59,219,0.35)',
                  background: 'rgba(255,255,255,0.75)',
                  outline: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0A1866',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 15,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#9AA6C0',
                  pointerEvents: 'none',
                }}
              >
                호
              </span>
            </div>
          </div>
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
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 32,
                    fontWeight: 700,
                    color: stat.color,
                    lineHeight: 1,
                  }}
                >
                  {stat.val}
                </div>
                <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 2, fontWeight: 500 }}>
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
              fontWeight: 500,
            }}
          >
            이력을 불러오는 중...
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(item => {
              const checked = selectedIds.includes(item.id);
              const hasSecondarySource = isValidSource(item.secondary_source);

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

                    <div style={{ fontSize: 11, color: '#9AA6C0', fontWeight: 500 }}>
                      {item.time} · {item.type} · {item.period} · Lmax {item.lmax} dB
                    </div>

                    {hasSecondarySource && (
                      <div style={{ fontSize: 10, color: '#7A8AB8', marginTop: 4, fontWeight: 500 }}>
                        세부 소음원: {Array.isArray(item.secondary_source) ? item.secondary_source.join(', ') : item.secondary_source}
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
                  fontWeight: 500,
                }}
              >
                {history.length === 0
                  ? '아직 측정 이력이 없습니다.'
                  : '해당하는 측정 이력이 없습니다.'}
              </div>
            )}
          </div>
        )}

        {reportError && <ErrorBox message={reportError} />}

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

        <button
          onClick={handleGenerateManagementReport}
          disabled={generatingManagement}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '15px',
            borderRadius: 18,
            border: '1px solid rgba(10,24,102,0.18)',
            background: generatingManagement
              ? 'rgba(255,255,255,0.5)'
              : 'rgba(255,255,255,0.7)',
            color: '#0A1866',
            fontSize: 14,
            fontWeight: 700,
            cursor: generatingManagement ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Building2 size={16} color="#0A1866" />
          {generatingManagement
            ? '관리사무소용 민원서 생성 중...'
            : `관리사무소용 민원서 생성하기 (${selectedIds.length}개 선택)`}
        </button>

        {managementPdfUrl && (
          <GlassCard style={{ padding: 20, marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1866' }}>
              관리사무소용 PDF 생성 완료
            </div>
            <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 6, fontWeight: 500 }}>
              새 창에서 PDF가 열렸습니다. 열리지 않았다면 아래 버튼을 눌러주세요.
            </div>

            <button
              onClick={handleDownloadManagementPdf}
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
              관리사무소용 PDF 열기
            </button>
          </GlassCard>
        )}

        {pdfUrl && (
          <GlassCard style={{ padding: 20, marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1866' }}>
              PDF 생성 완료
            </div>
            <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 6, fontWeight: 500 }}>
              새 창에서 PDF가 열렸습니다. 열리지 않았다면 아래 버튼을 눌러주세요.
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
              PDF 열기
            </button>

            <button
              onClick={handleShowVisitConsultGuide}
              style={{
                width: '100%',
                marginTop: 10,
                padding: '14px',
                borderRadius: 16,
                border: '1px solid rgba(10,24,102,0.18)',
                background: 'rgba(255,255,255,0.7)',
                color: '#0A1866',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <ClipboardList size={15} color="#0A1866" />
              방문상담 신청서 작성 안내
            </button>
          </GlassCard>
        )}
      </div>

      <TabBar />

      {showVisitGuide && (
        <VisitGuideSheet onClose={() => setShowVisitGuide(false)} />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes centerModalPop {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes sheetFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function VisitGuideSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(10,24,102,0.35)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        animation: 'sheetFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 28,
          padding: '32px 24px 28px',
          animation: 'centerModalPop 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '0 20px 50px rgba(10,24,102,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <ClipboardList size={24} color="#fff" />
        </div>

        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#0A1866',
            marginBottom: 10,
          }}
        >
          방문상담 신청서 작성 안내
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: '#5A6A94',
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          지금 생성된 PDF는 참고용 민원서입니다.
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: '#5A6A94',
            fontWeight: 500,
            marginBottom: 22,
          }}
        >
          이웃사이센터 '층간소음 방문상담'을 신청하실 때, 이 PDF에 정리된 소음 측정 이력과 세대 정보를 참고하여 방문상담 신청서를 작성해 주세요.
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 16,
            border: 'none',
            background: 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#0A1866',
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 16,
        marginBottom: 16,
        padding: '10px 14px',
        borderRadius: 12,
        background: 'rgba(217,48,37,0.08)',
        border: '1px solid rgba(217,48,37,0.2)',
        fontSize: 12,
        fontWeight: 500,
        color: '#C0271E',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <AlertTriangle size={13} color="#C0271E" />
      {message}
    </div>
  );
}
