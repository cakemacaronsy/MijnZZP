import { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../hooks/useAppData';
import { useTranslation } from '../hooks/useTranslation';
import { fmt } from '../utils/format';
import { parseCSV } from '../utils/csv';
import Card from '../components/shared/Card';
import { useToast } from '../components/shared/Toast';
import {
  getImportHistory,
  addImportRecord,
  removeImportRecord,
  analyzeTransactions,
} from '../services/import-history';
import { Upload, Check, X, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle, AlertCircle, History, Trash2, Calendar, Eye, LayoutDashboard } from 'lucide-react';
import '../components/shared/shared.css';

export default function BankImportScreen() {
  const { saveExpense, refresh, user, settings, updateSettings } = useContext(AppContext);
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [importedYear, setImportedYear] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  // Load import history on mount and whenever user changes
  useEffect(() => {
    setHistory(getImportHistory(user?.id));
  }, [user?.id]);

  const processFile = async (file) => {
    if (!file) return;

    // Validate file looks like CSV
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.txt') && file.type && !file.type.includes('csv') && !file.type.includes('text')) {
      toast.error(`Unsupported file: ${file.name}. Please drop a .csv file.`);
      return;
    }

    setFileName(file.name);
    setDone(false);
    setParseError('');
    setParsing(true);
    setTransactions([]);
    setSelected(new Set());

    try {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        throw new Error('File is empty');
      }
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        throw new Error('No transactions found in file. Check that it has at least a header row and one data row.');
      }

      setTransactions(parsed);
      // Auto-select: if any negatives exist, select those (typical bank CSV).
      // Otherwise select all (generic expense log where every row is already an expense).
      const hasNegatives = parsed.some(tx => tx.amount < 0);
      const defaultSelected = new Set();
      parsed.forEach((tx, i) => {
        if (hasNegatives ? tx.amount < 0 : tx.amount !== 0) defaultSelected.add(i);
      });
      setSelected(defaultSelected);

      // Analyze years to warn user if they're viewing a different year
      const a = analyzeTransactions(parsed);
      setAnalysis(a);
      toast.success(`Found ${parsed.length} transactions (${defaultSelected.size} selected)`);
    } catch (err) {
      console.error('CSV parse error:', err);
      setParseError(err.message || 'Failed to parse CSV');
      toast.error(err.message || 'Failed to parse CSV');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const toggleSelect = (index) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set();
    transactions.forEach((_, i) => all.add(i));
    setSelected(all);
  };

  const selectNone = () => setSelected(new Set());

  const handleImport = async () => {
    setImporting(true);
    setImportProgress(0);
    const total = selected.size;
    let ok = 0;
    let failed = 0;

    try {
      const indices = [...selected];
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        const tx = transactions[idx];
        if (!tx) continue;
        try {
          // Build description: prefer counterparty+description combined, fall back to either alone, then generic
          const descParts = [tx.counterparty, tx.description].filter(Boolean);
          const description = descParts.length > 0
            ? descParts.join(' — ')
            : `Imported ${tx.date}`;
          await saveExpense({
            description,
            amount: Math.abs(tx.amount),
            date: tx.date,
            category: 'other',
            vatRate: 21,
            supplier: tx.counterparty || tx.description || '',
            isAsset: false,
            depYears: 0,
            residualValue: 0,
          });
          ok++;
        } catch (e) {
          console.error('Failed to save transaction', tx, e);
          failed++;
        }
        setImportProgress(i + 1);
      }
      // Log import history (localStorage, per-user)
      const importedTxs = [...selected].map(i => transactions[i]).filter(Boolean);
      const totalAmount = importedTxs.reduce((s, tx) => s + Math.abs(tx.amount || 0), 0);
      addImportRecord({
        userId: user?.id || null,
        filename: fileName || 'import.csv',
        count: ok,
        failedCount: failed,
        totalAmount,
        dateRange: analysis?.dateRange || null,
        dominantYear: analysis?.dominantYear || null,
        yearCounts: analysis?.yearCounts || {},
      });
      setHistory(getImportHistory(user?.id));

      setImportedCount(ok);

      // AUTO-SWITCH year if imported data is in a different year.
      // This ensures the dashboard/overview immediately reflects the new data.
      let targetYear = settings.year;
      if (analysis?.dominantYear && analysis.dominantYear !== settings.year) {
        targetYear = analysis.dominantYear;
        await updateSettings({ year: targetYear });
      }
      setImportedYear(targetYear);

      setDone(true);
      await refresh();

      if (failed > 0) {
        toast.error(`Imported ${ok}/${total} — ${failed} failed. Check console.`);
      } else if (targetYear !== settings.year) {
        toast.success(`Imported ${ok} expenses — switched to ${targetYear} to show them`);
      } else {
        toast.success(`Imported ${ok} transactions as expenses`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(`Import failed: ${err.message}`);
    }
    setImporting(false);
  };

  const selectedCount = selected.size;
  const selectedTotal = [...selected].reduce((sum, i) => sum + Math.abs(transactions[i]?.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>{t.bank.title}</h1>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>{t.bank.sub}</p>

      {/* Upload area */}
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border, #d1d5db)'}`,
            background: dragOver ? 'rgba(249, 115, 22, 0.06)' : 'transparent',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileSpreadsheet size={40} color={dragOver ? 'var(--color-primary)' : 'var(--color-text-secondary)'} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            {dragOver ? 'Drop CSV here' : t.bank.upload}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {t.common.bankFormats} — or drag &amp; drop a file
          </p>
          {fileName && !dragOver && (
            <p style={{ fontSize: 13, color: 'var(--color-primary)', marginTop: 8 }}>{fileName}</p>
          )}
          {parsing && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8 }}>Parsing...</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </Card>

      {/* Parse error */}
      {parseError && (
        <Card style={{ marginBottom: 20, borderLeft: '3px solid var(--color-error)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Could not parse CSV</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{parseError}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                Needs columns for date, amount, and ideally a description. Supports bank exports (ING, ABN AMRO, Rabobank) and generic expense logs.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Import progress */}
      {importing && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Importing {importProgress} of {selected.size}...
          </p>
          <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'var(--color-primary)',
                width: `${(importProgress / Math.max(selected.size, 1)) * 100}%`,
                transition: 'width 0.2s',
              }}
            />
          </div>
        </Card>
      )}

      {/* Year info (auto-switch on import) */}
      {analysis?.dominantYear && analysis.dominantYear !== settings.year && transactions.length > 0 && !done && (
        <Card style={{ marginBottom: 20, borderLeft: '3px solid var(--color-secondary)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Calendar size={20} color="var(--color-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>
                Data is from {analysis.dominantYear}
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                You're currently viewing <strong>{settings.year}</strong>. After import, the dashboard will automatically switch to <strong>{analysis.dominantYear}</strong> so you see the new data.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction preview */}
      {transactions.length > 0 && !done && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>
              {transactions.length} {t.bank.found}
              {selectedCount > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--color-primary)' }}>
                  ({selectedCount} selected, {fmt(selectedTotal)})
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>{t.common.selectAll}</button>
              <button className="btn btn-ghost btn-sm" onClick={selectNone}>{t.common.selectNone}</button>
            </div>
          </div>

          <div className="table-wrapper" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Date</th>
                  <th>Counterparty</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={i}
                    style={{
                      opacity: selected.has(i) ? 1 : 0.5,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSelect(i)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggleSelect(i)}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td>{tx.date}</td>
                    <td>{tx.counterparty || '-'}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className="mono"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: tx.amount < 0 ? 'var(--color-error)' : 'var(--color-success)',
                        }}
                      >
                        {tx.amount < 0 ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                        {fmt(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
            >
              {importing ? t.bank.parsing : (
                <><Check size={16} /> {t.bank.bookSelected} ({selectedCount})</>
              )}
            </button>
            <button className="btn btn-secondary" onClick={() => { setTransactions([]); setSelected(new Set()); setFileName(''); setParseError(''); }}>
              <X size={16} /> {t.common.cancel}
            </button>
          </div>
        </>
      )}

      {/* Done state */}
      {done && (
        <Card style={{ textAlign: 'center', padding: 40, marginBottom: 20 }}>
          <Check size={48} color="var(--color-success)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            {importedCount} expenses imported
          </p>
          {importedYear && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Now viewing year <strong>{importedYear}</strong>. Edit individual rows in the Expenses tab.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/expenses')}
            >
              <Eye size={16} /> View &amp; Edit Expenses
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setTransactions([]); setSelected(new Set()); setFileName(''); setDone(false); setImportedCount(0); setImportProgress(0); setAnalysis(null); setImportedYear(null); }}
            >
              Import More
            </button>
          </div>
        </Card>
      )}

      {/* Import History */}
      {history.length > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <History size={18} />
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Import History</h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>({history.length})</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>File</th>
                  <th style={{ textAlign: 'right' }}>Transactions</th>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {history.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(rec.importedAt).toLocaleDateString()}
                      <span style={{ color: 'var(--color-text-secondary)', marginLeft: 6, fontSize: 12 }}>
                        {new Date(rec.importedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.filename}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {rec.count}
                      {rec.failedCount > 0 && (
                        <span style={{ color: 'var(--color-error)', marginLeft: 4 }}>(+{rec.failedCount} failed)</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {rec.dateRange
                        ? `${rec.dateRange.from} → ${rec.dateRange.to}`
                        : rec.dominantYear || '-'}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>{fmt(rec.totalAmount || 0)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {rec.dominantYear && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title={`View expenses from ${rec.dominantYear}`}
                            onClick={async () => {
                              if (rec.dominantYear !== settings.year) {
                                await updateSettings({ year: rec.dominantYear });
                              }
                              navigate('/expenses');
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Remove from history"
                          onClick={() => {
                            removeImportRecord(rec.id);
                            setHistory(getImportHistory(user?.id));
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            Removing from history does not delete imported expenses — manage those in the Expenses tab.
          </p>
        </Card>
      )}
    </div>
  );
}
