import { useContext, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Badge from '../../components/shared/Badge';
import { ArrowLeft, Pencil, Download, CheckCircle } from 'lucide-react';
import '../../components/shared/shared.css';

export default function InvoicePreviewScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, profile, payInvoice } = useContext(AppContext);
  const { t } = useTranslation();
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const invoice = invoices.find((inv) => inv.id === id);

  const lines = useMemo(() => {
    if (!invoice) return [];
    const parsed = typeof invoice.lines === 'string'
      ? JSON.parse(invoice.lines)
      : invoice.lines;
    return Array.isArray(parsed) ? parsed : [];
  }, [invoice]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0),
    [lines],
  );

  const vatRate = invoice?.vatRate ?? 21;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const now = new Date().toISOString().slice(0, 10);
  const status =
    invoice?.status === 'paid'
      ? 'paid'
      : invoice?.dueDate && invoice.dueDate < now
        ? 'overdue'
        : 'unpaid';

  const handleMarkPaid = async () => {
    await payInvoice(id);
  };

  const handleDownloadPdf = async () => {
    if (downloading || !previewRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const filename = `invoice-${invoice.number || id}.pdf`;
      await html2pdf()
        .set({
          margin: 10,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(previewRef.current)
        .save();
    } catch (e) {
      console.error('PDF generation failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (!invoice) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={18} />
            Back
          </button>
        </div>
        <div className="empty-state">
          <p>Invoice not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={18} />
          </button>
          <h1>{t.inv.preview}</h1>
          <Badge status={status} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {status !== 'paid' && (
            <button className="btn btn-primary" onClick={handleMarkPaid}>
              <CheckCircle size={16} />
              {t.inv.markPaid}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            <Download size={16} />
            {downloading ? 'Generating...' : t.inv.generate}
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(`/invoices/${id}/edit`)}>
            <Pencil size={16} />
            {t.inv.edit}
          </button>
        </div>
      </div>

      {/* Invoice preview */}
      <div
        ref={previewRef}
        style={{
          background: '#fff',
          color: '#1a1a1a',
          borderRadius: 8,
          padding: 40,
          maxWidth: 800,
          margin: '0 auto',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header row: company info + invoice meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
          {/* From (company) */}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {profile.companyName || 'Your Company'}
            </div>
            {profile.address && (
              <div style={{ fontSize: 13, color: '#666' }}>{profile.address}</div>
            )}
            {profile.postal && (
              <div style={{ fontSize: 13, color: '#666' }}>{profile.postal}</div>
            )}
            {profile.email && (
              <div style={{ fontSize: 13, color: '#666' }}>{profile.email}</div>
            )}
            {profile.phone && (
              <div style={{ fontSize: 13, color: '#666' }}>{profile.phone}</div>
            )}
            {profile.web && (
              <div style={{ fontSize: 13, color: '#666' }}>{profile.web}</div>
            )}
          </div>

          {/* Invoice number + dates */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F97316', marginBottom: 8 }}>
              INVOICE
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{invoice.number}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              {t.inv.date}: {invoice.date || '-'}
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {t.inv.due}: {invoice.dueDate || '-'}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#999',
              marginBottom: 4,
            }}
          >
            Bill To
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{invoice.client || '-'}</div>
          {invoice.clientEmail && (
            <div style={{ fontSize: 13, color: '#666' }}>{invoice.clientEmail}</div>
          )}
          {invoice.clientAddress && (
            <div style={{ fontSize: 13, color: '#666', whiteSpace: 'pre-line' }}>
              {invoice.clientAddress}
            </div>
          )}
        </div>

        {/* Line items table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px solid #e5e7eb',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: '8px 0', fontWeight: 600 }}>{t.inv.desc}</th>
              <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                {t.inv.qty}
              </th>
              <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                {t.inv.unitPrice}
              </th>
              <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                {t.inv.lineTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const lineTotal =
                (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0' }}>{line.description || '-'}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>{line.qty}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>
                    {fmt(parseFloat(line.unitPrice) || 0)}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>
                    {fmt(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 280 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: 13,
              }}
            >
              <span>{t.inv.subtotal}</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(subtotal)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: 13,
              }}
            >
              <span>
                {t.inv.vatAmount} ({vatRate}%)
              </span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(vatAmount)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0 0',
                borderTop: '2px solid #1a1a1a',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <span>{t.inv.grandTotal}</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment details */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 16,
            borderTop: '1px solid #e5e7eb',
            fontSize: 12,
            color: '#666',
          }}
        >
          {profile.kvk && <div>KVK: {profile.kvk}</div>}
          {profile.btw && <div>BTW: {profile.btw}</div>}
          {profile.iban && <div>IBAN: {profile.iban}</div>}
          {invoice.notes && (
            <div style={{ marginTop: 8, whiteSpace: 'pre-line', color: '#444' }}>
              {invoice.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
