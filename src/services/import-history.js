// Tracks past bank CSV imports in localStorage (per-user, MVP-level persistence).
// Each record: { id, userId, filename, importedAt, count, totalAmount, dateRange: {from, to}, dominantYear }

const KEY = 'mijnzzp_import_history';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (_) {}
}

export function getImportHistory(userId) {
  const all = load();
  if (!userId) return all;
  return all.filter(r => r.userId === userId);
}

export function addImportRecord(record) {
  const all = load();
  const entry = {
    id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    importedAt: new Date().toISOString(),
    ...record,
  };
  all.unshift(entry);
  // Keep last 100
  save(all.slice(0, 100));
  return entry;
}

export function removeImportRecord(id) {
  const all = load();
  save(all.filter(r => r.id !== id));
}

export function clearImportHistory(userId) {
  if (!userId) {
    save([]);
    return;
  }
  const all = load();
  save(all.filter(r => r.userId !== userId));
}

// Extract dominant year and date range from a list of transactions
export function analyzeTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    return { dominantYear: null, dateRange: null, yearCounts: {} };
  }
  const yearCounts = {};
  let min = null;
  let max = null;
  for (const tx of transactions) {
    if (!tx.date) continue;
    const year = tx.date.slice(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + 1;
    if (!min || tx.date < min) min = tx.date;
    if (!max || tx.date > max) max = tx.date;
  }
  const sortedYears = Object.entries(yearCounts).sort((a, b) => b[1] - a[1]);
  const dominantYear = sortedYears[0]?.[0] || null;
  return {
    dominantYear: dominantYear ? parseInt(dominantYear, 10) : null,
    dateRange: min && max ? { from: min, to: max } : null,
    yearCounts,
  };
}
