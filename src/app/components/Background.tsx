export function Background() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'rgba(45,82,240,0.18)',
          top: -80,
          right: -80,
          filter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'rgba(107,138,255,0.16)',
          bottom: 80,
          left: -90,
          filter: 'blur(4px)',
        }}
      />
    </div>
  );
}
