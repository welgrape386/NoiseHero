export function Background() {
  return (
    <>
      {/* Blob 1 */}
      <div
        className="noise-blob"
        style={{
          width: 280, height: 260,
          top: -60, left: -80,
          background: 'radial-gradient(circle, #3A5AF5, #1A3BDB, transparent)',
          opacity: 0.55,
        }}
      />
      {/* Blob 2 */}
      <div
        className="noise-blob"
        style={{
          width: 220, height: 200,
          bottom: 120, right: -60,
          background: 'radial-gradient(circle, #2D52F0, #0A1A8C, transparent)',
          filter: 'blur(110px)',
          opacity: 0.45,
        }}
      />
      {/* Blob 3 */}
      <div
        className="noise-blob"
        style={{
          width: 160, height: 140,
          top: '38%', left: '40%',
          background: 'radial-gradient(circle, #6B8AFF, #3A5AF5, transparent)',
          opacity: 0.3,
        }}
      />
      {/* Grain overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  );
}
