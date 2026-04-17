// Builds a compact text summary of the user's bookkeeping data to give the AI tax advisor
// full context about their actual finances. Keeps within a reasonable token budget.

import { fmt } from '../utils/format';
import { calcBox1, calcVatSummary, calcQuarterlyBtw, calcDepreciation } from '../utils/tax-calc';
import { HOURS_CRITERION } from '../constants/tax';

/**
 * Returns a markdown-formatted string summarizing the user's data.
 * Pass this as part of the system prompt so the AI can answer data-specific questions.
 */
export function buildAdvisorContext({
  invoices = [],
  expenses = [],
  personalItems = [],
  clients = [],
  settings = {},
  profile = {},
  year,
} = {}) {
  const totalHours = (settings.workedHours || 0) + (settings.calendarHours || 0);
  const hoursMet = totalHours >= HOURS_CRITERION;
  const isStarter = !!settings.isStarter;

  // Revenue / expense totals
  const revenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const depTotal = expenses.reduce((sum, exp) => sum + calcDepreciation(exp, year), 0);

  // Tax calculations
  const box1 = calcBox1(revenue, expenseTotal, depTotal, hoursMet, isStarter);
  const vat = calcVatSummary(invoices, expenses);
  const quarters = calcQuarterlyBtw(invoices, expenses);

  // Expenses by category
  const byCat = {};
  for (const e of expenses) {
    const cat = e.category || 'other';
    byCat[cat] = (byCat[cat] || 0) + (e.amount || 0);
  }
  const topCats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Invoice status counts
  const now = new Date().toISOString().slice(0, 10);
  const paid = invoices.filter(i => i.status === 'paid');
  const unpaid = invoices.filter(i => i.status !== 'paid' && (!i.dueDate || i.dueDate >= now));
  const overdue = invoices.filter(i => i.status !== 'paid' && i.dueDate && i.dueDate < now);

  // Sample data for the AI (recent items, capped)
  const recentInvoices = [...invoices]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 8)
    .map(i => `- ${i.date} | ${i.client || 'Unknown'} | ${fmt(i.amount)} | ${i.status}`);
  const recentExpenses = [...expenses]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 10)
    .map(e => `- ${e.date} | ${e.category} | ${e.supplier || '-'} | ${fmt(e.amount)}`);

  // Personal items summary
  const personalIncome = personalItems.filter(p => p.side === 'income').reduce((s, p) => s + (p.amount || 0), 0);
  const personalExpense = personalItems.filter(p => p.side === 'expense').reduce((s, p) => s + (p.amount || 0), 0);

  const lines = [];
  lines.push(`# User's Bookkeeping Data (year ${year || 'current'})`);
  lines.push('');
  lines.push('## Profile');
  if (profile.companyName) lines.push(`- Company: ${profile.companyName}`);
  if (profile.kvk) lines.push(`- KVK: ${profile.kvk}`);
  if (profile.btw) lines.push(`- BTW: ${profile.btw}`);
  lines.push(`- Starter status: ${isStarter ? 'Yes (first 5 years)' : 'No'}`);
  lines.push(`- Hours worked: ${totalHours} / ${HOURS_CRITERION} ${hoursMet ? '(criterion met)' : '(below criterion)'}`);
  if (settings.businessType) lines.push(`- Business type: ${settings.businessType}`);

  lines.push('');
  lines.push('## Totals');
  lines.push(`- Revenue (invoices): ${fmt(revenue)} across ${invoices.length} invoices`);
  lines.push(`- Business expenses: ${fmt(expenseTotal)} across ${expenses.length} items`);
  lines.push(`- Profit before deductions: ${fmt(revenue - expenseTotal)}`);
  lines.push(`- Depreciation this year: ${fmt(depTotal)}`);

  lines.push('');
  lines.push('## Tax Calculation (estimated)');
  lines.push(`- Gross profit: ${fmt(box1.gross)}`);
  lines.push(`- Self-employed deductions (zelfstandigenaftrek + startersaftrek): ${fmt(box1.sed)}`);
  lines.push(`- After deductions: ${fmt(box1.sd)}`);
  lines.push(`- MKB-winstvrijstelling (13.94%): ${fmt(box1.mkb)}`);
  lines.push(`- Taxable income (Box 1): ${fmt(box1.taxable)}`);

  lines.push('');
  lines.push('## BTW (VAT)');
  lines.push(`- BTW collected on sales: ${fmt(vat.collected)}`);
  lines.push(`- BTW paid on purchases: ${fmt(vat.paid)}`);
  lines.push(`- Net BTW owed: ${fmt(vat.owed)}`);
  if (Array.isArray(quarters) && quarters.length === 4) {
    lines.push(`- Q1: ${fmt(quarters[0]?.total || 0)} | Q2: ${fmt(quarters[1]?.total || 0)} | Q3: ${fmt(quarters[2]?.total || 0)} | Q4: ${fmt(quarters[3]?.total || 0)}`);
  }

  if (topCats.length > 0) {
    lines.push('');
    lines.push('## Top expense categories');
    for (const [cat, amt] of topCats) {
      lines.push(`- ${cat}: ${fmt(amt)}`);
    }
  }

  lines.push('');
  lines.push('## Invoices');
  lines.push(`- Paid: ${paid.length} (${fmt(paid.reduce((s, i) => s + (i.amount || 0), 0))})`);
  lines.push(`- Unpaid: ${unpaid.length} (${fmt(unpaid.reduce((s, i) => s + (i.amount || 0), 0))})`);
  lines.push(`- Overdue: ${overdue.length} (${fmt(overdue.reduce((s, i) => s + (i.amount || 0), 0))})`);
  if (recentInvoices.length > 0) {
    lines.push('');
    lines.push('### Recent invoices (most recent first)');
    lines.push(...recentInvoices);
  }

  if (recentExpenses.length > 0) {
    lines.push('');
    lines.push('## Recent expenses (most recent first)');
    lines.push(...recentExpenses);
  }

  if (clients.length > 0) {
    lines.push('');
    lines.push(`## Clients (${clients.length})`);
    lines.push(...clients.slice(0, 10).map(c => `- ${c.name}${c.company ? ` (${c.company})` : ''}`));
  }

  if (personalIncome > 0 || personalExpense > 0) {
    lines.push('');
    lines.push('## Personal (non-business)');
    lines.push(`- Personal income: ${fmt(personalIncome)}`);
    lines.push(`- Personal expenses: ${fmt(personalExpense)}`);
  }

  return lines.join('\n');
}
