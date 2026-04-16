import './shared.css';

export default function Card({ children, className = '', onClick, style }) {
  return (
    <div className={`card ${className}`} onClick={onClick} style={style}>
      {children}
    </div>
  );
}
