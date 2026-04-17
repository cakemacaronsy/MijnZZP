import { useState, useEffect } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { getReceiptPhotoUrl } from '../../lib/db';
import './shared.css';

/**
 * Renders a clickable thumbnail for an expense's receipt photo.
 * Fetches the signed URL lazily. Clicking opens a full-screen lightbox.
 */
export default function ReceiptThumbnail({ expenseId, size = 40 }) {
  const [url, setUrl] = useState(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!expenseId) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await getReceiptPhotoUrl(expenseId);
        if (!cancelled && u) setUrl(u);
      } catch (e) {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [expenseId]);

  if (error || !url) {
    return null;
  }

  return (
    <>
      <img
        src={url}
        alt="Receipt"
        className="receipt-thumb"
        style={{ width: size, height: size, opacity: loaded ? 1 : 0.3 }}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {open && (
        <div className="receipt-lightbox" onClick={() => setOpen(false)}>
          <button className="receipt-lightbox-close" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
            <X size={20} />
          </button>
          <img src={url} alt="Receipt" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

export function ReceiptPlaceholder({ size = 40 }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: 6,
        border: '1px dashed var(--color-border)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-secondary)',
        background: 'var(--color-bg-secondary)',
      }}
    >
      <ImageIcon size={size * 0.4} />
    </div>
  );
}
