export default function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', cursor: onClick ? 'pointer' : 'default', transition: 'border-color .2s', display: 'flex', alignItems: 'center', gap: 14 }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color || 'var(--blue)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      </div>
    </div>
  );
}
