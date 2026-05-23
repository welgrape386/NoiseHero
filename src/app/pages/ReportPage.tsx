import { useState, useEffect } from 'react';
import { Background } from '../components/Background';
import { TabBar } from '../components/TabBar';
import { FileText, Download, Share2, ChevronRight, X, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { apiGetHistory, mapRecord, type HistoryItem } from '../services/api';

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.58)',
      backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
      border: '1px solid rgba(255,255,255,0.88)',
      borderRadius: 24, ...style,
    }}>
      {children}
    </div>
  );
}

function DetailModal({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
  // API?êÏÑú Î∞õÏ? leq_standard / lmax_standard ?∞ÏÑ† ?¨Ïö©
  const leqLimit = item.leq_standard ?? (item.period === '?ºÍ∞Ñ' ? 34 : 39);
  const lmaxLimit = item.lmax_standard && item.lmax_standard > 0 ? item.lmax_standard : null;
  const leqOver = item.db > leqLimit;
  const lmaxOver = lmaxLimit !== null && item.lmax > lmaxLimit;
  const [pdfDone, setPdfDone] = useState(false);

  function handlePdf() {
    setTimeout(() => setPdfDone(true), 1200);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,26,140,0.25)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(240,242,250,0.98)',
        borderRadius: '28px 28px 0 0',
        padding: '28px 24px 40px',
        maxHeight: '88vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: '#0A1866' }}>
              ?ÅÏÑ∏ Ï∏°Ï†ï Í≤∞Í≥º
            </div>
            <div style={{ fontSize: 11, color: '#7A8AB8', marginTop: 2 }}>{item.time} ¬∑ {item.type} ¬∑ {item.period}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="#0A1866" />
          </button>
        </div>

        {/* Values */}
        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8C98B8', marginBottom: 14 }}>Ï∏°Ï†ïÍ∞?vs Î≤ïÏ†Å Í∏∞Ï?</div>

          {/* Leq */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#7A8AB8' }}>Leq (?âÍ∑† ?åÏùå)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: leqOver ? '#C0271E' : '#1A3BDB' }}>
                  {item.db} dB
                </span>
                {leqOver ? <AlertTriangle size={14} color="#C0271E" /> : <CheckCircle size={14} color="#1A3BDB" />}
              </div>
            </div>
            <div style={{ height: 8, background: '#e5e9f5', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: `${Math.min((leqLimit / 100) * 100, 100)}%`, top: 0, bottom: 0, width: 2, background: '#1A3BDB', opacity: 0.4 }} />
              <div style={{
                width: `${Math.min((item.db / 100) * 100, 100)}%`, height: '100%', borderRadius: 8,
                background: leqOver ? 'linear-gradient(90deg, #ff6b6b, #D93025)' : 'linear-gradient(90deg, #4B6EFF, #1A3BDB)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: '#9AA6C0' }}>Í∏∞Ï?: {leqLimit} dB</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: leqOver ? '#C0271E' : '#1A3BDB' }}>
                {leqOver ? `+${Math.round((item.db - leqLimit) * 10) / 10} dB Ï¥àÍ≥º` : `?¨Ïú† ${Math.round((leqLimit - item.db) * 10) / 10} dB`}
              </span>
            </div>
          </div>

          {/* Lmax */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#7A8AB8' }}>Lmax (ÏµúÍ≥† ?åÏùå)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: lmaxOver ? '#C0271E' : '#1A3BDB' }}>
                  {item.lmax} dB
                </span>
                {lmaxLimit === null
                  ? <span style={{ fontSize: 10, color: '#9AA6C0' }}>ÎØ∏Ï†Å??/span>
                  : lmaxOver ? <AlertTriangle size={14} color="#C0271E" /> : <CheckCircle size={14} color="#1A3BDB" />}
              </div>
            </div>
            {lmaxLimit !== null ? (
              <>
                <div style={{ height: 8, background: '#e5e9f5', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: `${Math.min((lmaxLimit / 100) * 100, 100)}%`, top: 0, bottom: 0, width: 2, background: '#1A3BDB', opacity: 0.4 }} />
                  <div style={{
                    width: `${Math.min((item.lmax / 100) * 100, 100)}%`, height: '100%', borderRadius: 8,
                    background: lmaxOver ? 'linear-gradient(90deg, #ff6b6b, #D93025)' : 'linear-gradient(90deg, #4B6EFF, #1A3BDB)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#9AA6C0' }}>Í∏∞Ï?: {lmaxLimit} dB</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: lmaxOver ? '#C0271E' : '#1A3BDB' }}>
                    {lmaxOver ? `+${Math.round((item.lmax - lmaxLimit) * 10) / 10} dB Ï¥àÍ≥º` : `?¨Ïú† ${Math.round((lmaxLimit - item.lmax) * 10) / 10} dB`}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 10, color: '#9AA6C0', marginTop: 4 }}>Í≥µÍ∏∞?ÑÎã¨?åÏ? Lmax Í∏∞Ï????ÜÏäµ?àÎã§.</div>
            )}
          </div>

          {/* Overall status */}
          <div style={{
            marginTop: 8, padding: '12px 16px', borderRadius: 14,
            background: leqOver || lmaxOver ? 'rgba(217,48,37,0.08)' : 'rgba(26,59,219,0.06)',
            border: `1px solid ${leqOver || lmaxOver ? 'rgba(217,48,37,0.2)' : 'rgba(26,59,219,0.12)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {leqOver || lmaxOver
              ? <AlertTriangle size={16} color="#C0271E" />
              : <CheckCircle size={16} color="#1A3BDB" />}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: leqOver || lmaxOver ? '#C0271E' : '#1A3BDB' }}>
                {leqOver || lmaxOver ? 'Î≤ïÏ†Å Í∏∞Ï? Ï¥àÍ≥º' : 'Î≤ïÏ†Å Í∏∞Ï? ?¥ÎÇ¥'}
              </div>
              <div style={{ fontSize: 10, color: '#7A8AB8', marginTop: 2 }}>
                {item.period === '?ºÍ∞Ñ'
                  ? item.type === 'ÏßÅÏ†ëÏ∂©Í≤©'
                    ? '?ºÍ∞Ñ Í∏∞Ï?: Leq 34 dB / Lmax 52 dB'
                    : '?ºÍ∞Ñ Í∏∞Ï?: Leq 40 dB (Lmax ÎØ∏Ï†Å??'
                  : item.type === 'ÏßÅÏ†ëÏ∂©Í≤©'
                    ? 'Ï£ºÍ∞Ñ Í∏∞Ï?: Leq 39 dB / Lmax 57 dB'
                    : 'Ï£ºÍ∞Ñ Í∏∞Ï?: Leq 45 dB (Lmax ÎØ∏Ï†Å??'}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* PDF Export */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#8C98B8', marginBottom: 12 }}>PDF ?¥Î≥¥?¥Í∏∞</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePdf}
            style={{
              flex: 1, padding: '14px', borderRadius: 16,
              background: pdfDone ? 'rgba(26,59,219,0.1)' : 'linear-gradient(135deg, #2D52F0, #1A3BDB)',
              color: pdfDone ? '#1A3BDB' : '#fff', border: 'none', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <FileText size={15} color={pdfDone ? '#1A3BDB' : '#fff'} />
            {pdfDone ? 'PDF ?ùÏÑ±???? : 'PDF ?ùÏÑ±'}
          </button>
          <button
            onClick={() => alert('Í≥µÏú† Í∏∞Îä•: Ïπ¥Ïπ¥?§ÌÜ° ?êÎäî ?¥Î©î?ºÎ°ú Í≥µÏú†?©Îãà??')}
            style={{
              flex: 1, padding: '14px', borderRadius: 16,
              background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)',
              color: '#0A1866', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Share2 size={15} color="#0A1866" />
            Í≥µÏú†?òÍ∏∞
          </button>
        </div>

        {pdfDone && (
          <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(26,59,219,0.06)', fontSize: 11, color: '#7A8AB8', lineHeight: 1.6 }}>
            ?ìÑ Í¥ÄÍ≥µÏÑú ?úÏ∂ú??PDFÍ∞Ä ?ùÏÑ±?òÏóà?µÎãà??<br />
            ?¨Ìï® ?ïÎ≥¥: Ï∏°Ï†ï?ºÏãú, Ï∏°Ï†ïÍ∞? Î≤ïÏ†Å Í∏∞Ï? ÎπÑÍµê, Ï∏°Ï†ï???ïÎ≥¥
          </div>
        )}
      </div>
    </div>
  );
}

export function ReportPage() {
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'over' | 'ok'>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  async function loadHistory() {
    setLoading(true);
    setFetchError('');
    try {
      const records = await apiGetHistory();
      setHistory(records.map(mapRecord));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '?¥Î†•??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  const filtered = history.filter(item => {
    if (filter === 'over') return item.over;
    if (filter === 'ok') return !item.over;
    return true;
  });

  const overCount = history.filter(i => i.over).length;
  const avgDb = history.length > 0
    ? Math.round(history.reduce((a, i) => a + i.db, 0) / history.length * 10) / 10
    : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#F0F2FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Background />

      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: '#0A1866' }}>
              ?ÑÏ†Å Î¶¨Ìè¨??
            </div>
            <div style={{ fontSize: 12, color: '#7A8AB8', marginTop: 4 }}>Ï∏°Ï†ï ?¥Î†• Î∞?PDF ?ùÏÑ±</div>
          </div>
          <button
            onClick={loadHistory}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.88)',
              borderRadius: 12, width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={16} color="#7A8AB8" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* ?§Î•ò Î©îÏãúÏßÄ */}
        {fetchError && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 12,
            background: 'rgba(217,48,37,0.08)', border: '1px solid rgba(217,48,37,0.2)',
            fontSize: 12, color: '#C0271E',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={13} color="#C0271E" />
            {fetchError}
          </div>
        )}

        {/* Summary */}
        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8C98B8', marginBottom: 14 }}>?ÑÏ≤¥ ?îÏïΩ</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Ï¥?Ï∏°Ï†ï', val: history.length, unit: '??, color: '#0A1A8C' },
              { label: 'Í∏∞Ï? Ï¥àÍ≥º', val: overCount, unit: '??, color: '#C0271E' },
              { label: '?âÍ∑† ?åÏùå', val: avgDb, unit: 'dB', color: '#0A1A8C' },
            ].map(stat => (
              <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, color: stat.color, lineHeight: 1 }}>
                  {stat.val}
                </div>
                <div style={{ fontSize: 11, color: '#9AA6C0', marginTop: 2 }}>
                  {stat.unit} ¬∑ {stat.label}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { key: 'all', label: '?ÑÏ≤¥' },
            { key: 'over', label: 'Ï¥àÍ≥ºÎß? },
            { key: 'ok', label: '?ïÏÉÅÎß? },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as 'all' | 'over' | 'ok')}
              style={{
                padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                background: filter === f.key ? '#1A3BDB' : 'rgba(255,255,255,0.6)',
                color: filter === f.key ? '#fff' : '#7A8AB8',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Î°úÎî© ?ÅÌÉú */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9AA6C0', fontSize: 13 }}>
            ?¥Î†•??Î∂àÎü¨?§Îäî Ï§?..
          </div>
        )}

        {/* History List */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(item => (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(18px)',
                  border: '1px solid rgba(255,255,255,0.7)',
                  borderRadius: 18,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: item.over ? '#D93025' : '#1A3BDB' }} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: '#0A1866' }}>
                      {item.db} dB(A)
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                      background: item.over ? 'rgba(217,48,37,0.1)' : 'rgba(26,59,219,0.08)',
                      color: item.over ? '#C0271E' : '#1A3BDB',
                    }}>
                      {item.over ? 'Ï¥àÍ≥º' : '?ïÏÉÅ'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9AA6C0' }}>
                    {item.time} ¬∑ {item.type} ¬∑ {item.period} ¬∑ Lmax {item.lmax} dB
                  </div>
                </div>

                <ChevronRight size={16} color="#9AA6C0" />
              </div>
            ))}

            {filtered.length === 0 && !fetchError && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9AA6C0', fontSize: 13 }}>
                {history.length === 0 ? '?ÑÏßÅ Ï∏°Ï†ï ?¥Î†•???ÜÏäµ?àÎã§.' : '?¥Îãπ?òÎäî Ï∏°Ï†ï ?¥Î†•???ÜÏäµ?àÎã§.'}
              </div>
            )}
          </div>
        )}
      </div>

      <TabBar />

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes Download { }
      `}</style>
    </div>
  );
}
