export default function Badge({ label, color, bg, size = 11 }) {
  return (
    <span style={{ fontSize: size, padding: '2px 8px', borderRadius: 99, background: bg, color, fontWeight: 700, whiteSpace: 'nowrap', border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}
