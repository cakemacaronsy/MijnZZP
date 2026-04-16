import './shared.css';

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
