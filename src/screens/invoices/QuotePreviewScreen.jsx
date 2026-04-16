import { useContext, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Badge from '../../components/shared/Badge';
import Card from '../../components/shared/Card';
import { ArrowLeft, Download, Pencil, Send, CheckCircle, XCircle } from 'lucide-react';
import '../../components/shared/shared.css';

export default function QuotePreviewScreen() {
  const { quotes, setQuoteStatus, profile } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [pdfLoading, setPdfLoading] = useState(false);

  const quote = useMemo(() => quotes.find((q) => q.id === id), [quotes, id]);

  if (!quote) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/quotes')}>
              <ArrowLeft size={16} />
            </button>
            <h1>{t.quote.title}</h1>
          </div>
        </div>
        <div className="empty-state">
          <p>Quotation not found</p>
        </div>
      </div>
    );
  }

  const lines = quote.lines || [];

  const totals = useMemo(() => {
    let subtotal = 0;
    let vatTotal = 0;
    for (const line of lines) {
      const lineAmount = (line.qty || 0) * (line.unitPrice || 0);
      subtotal += lineAmount;
      vatTotal += lineAmount * ((line.vatRate || 0) / 100);
    }
    const grandTotal = subtotal + vatTotal;
    const downPercent = quote.downPercent || 0;
    const downAmount = grandTotal * (downPercent / 100);
    return { subtotal, vatTotal, grandTotal, downPercent, downAmount };
  }, [lines, quote.downPercent]);

  const handleStatusChange = async (status) => {
    await setQuoteStatus(quote.id, status);
  };

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('quote-preview-content');
      if (!element) return;

      const opt = {
        margin: 10,
        filename: `${quote.number || 'quotation'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error('PDF generation failed:', e);
    } finally {
      setPdfLoading(false);
    }
  };

  const statusActions = [];
  if (quote.status === 'draft') {
    statusActions.push({ label: t.quote.markSent, status: 'sent', icon: Send });
  }
  if (quote.status === 'sent') {
    statusActions.push({ label: t.quote.markAccepted, status: 'accepted', icon: CheckCircle });
    statusActions.push({ label: t.quote.markDeclined, status: 'declined', icon: XCircle });
  }
  if (quote.status === 'accepted') {
    statusActions.push({ label: t.quote.toInvoice, status: 'invoiced', icon: CheckCircle });
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/quotes')}>
            <ArrowLeft size={16} />
          </button>
          <h1>{t.quote.offerteLabel} {quote.number}</h1>
          <Badge status={quote.status || 'draft'} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/quotes/${id}/edit`)}
            title={t.inv.edit}
          >
            <Pencil size={16} />
            {t.inv.edit}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handlePdf}
            disabled={pdfLoading}
          >
            <Download size={16} />
            {pdfLoading ? '...' : t.quote.generate}
          </button>
        </div>
      </div>

      {/* Status action buttons */}
      {statusActions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {statusActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.status}
                className={`btn ${action.status === 'declined' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => handleStatusChange(action.status)}
              >
                <Icon size={16} />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Printable preview content */}
      <Card>
        <div id="quote-preview-content" style={{ padding: 32, background: '#fff', color: '#1a1a1a' }}>
          {/* Company header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                {profile?.companyName || 'Company Name'}
              </h2>
              <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>
                {profile?.address || ''}
              </p>
              <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>
                {profile?.postal || ''}
              </p>
              {profile?.kvk && (
                <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>KVK: {profile.kvk}</p>
              )}
              {profile?.btw && (
                <p style={{ margin: '4px 0', fontSize: 13, color: '#666' }}>BTW: {profile.btw}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#F97316' }}>
                {t.quote.offerteLabel}
              </h3>
              <p style={{ margin: '4px 0', fontSize: 13 }}>{quote.number || '-'}</p>
              <p style={{ margin: '4px 0', fontSize: 13 }}>{quote.date || '-'}</p>
              {quote.validUntil && (
                <p style={{ margin: '4px 0', fontSize: 13 }}>
                  {t.quote.validUntil}: {quote.validUntil}
                </p>
              )}
            </div>
          </div>

          {/* Client info */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{quote.client || '-'}</p>
            {quote.clientAddress && (
              <p style={{ margin: '2px 0', fontSize: 13, color: '#666' }}>{quote.clientAddress}</p>
            )}
            {quote.clientEmail && (
              <p style={{ margin: '2px 0', fontSize: 13, color: '#666' }}>{quote.clientEmail}</p>
            )}
          </div>

          {/* Line items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 13 }}>{t.inv.desc}</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13 }}>{t.inv.qty}</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13 }}>{t.inv.unitPrice}</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13 }}>{t.inv.vat}</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13 }}>{t.inv.lineTotal}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const lineTotal = (line.qty || 0) * (line.unitPrice || 0);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px', fontSize: 13 }}>{line.description || '-'}</td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13 }}>{line.qty}</td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13, fontFamily: 'monospace' }}>
                      {fmt(line.unitPrice)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13 }}>{line.vatRate}%</td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13, fontFamily: 'monospace' }}>
                      {fmt(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>{t.inv.subtotal}</span>
                <span style={{ fontFamily: 'monospace' }}>{fmt(totals.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>{t.inv.vatAmount}</span>
                <span style={{ fontFamily: 'monospace' }}>{fmt(totals.vatTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 15, fontWeight: 700, borderTop: '2px solid #1a1a1a' }}>
                <span>{t.inv.grandTotal}</span>
                <span style={{ fontFamily: 'monospace' }}>{fmt(totals.grandTotal)}</span>
              </div>

              {/* Down payment section */}
              {totals.downPercent > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, color: '#F97316', borderTop: '1px solid #e5e7eb' }}>
                    <span>{t.quote.downPayment} ({totals.downPercent}%)</span>
                    <span style={{ fontFamily: 'monospace' }}>{fmt(totals.downAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#666' }}>
                    <span>Remaining</span>
                    <span style={{ fontFamily: 'monospace' }}>{fmt(totals.grandTotal - totals.downAmount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment terms */}
          {quote.paymentDays && (
            <p style={{ marginTop: 24, fontSize: 12, color: '#666' }}>
              {t.inv.paymentTerms}: {quote.paymentDays} {t.inv.days}
            </p>
          )}

          {/* Notes */}
          {quote.notes && (
            <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 6 }}>
              <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{quote.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#999', textAlign: 'center' }}>
            {profile?.companyName && <span>{profile.companyName}</span>}
            {profile?.iban && <span> | IBAN: {profile.iban}</span>}
            {profile?.kvk && <span> | KVK: {profile.kvk}</span>}
            {profile?.btw && <span> | BTW: {profile.btw}</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
