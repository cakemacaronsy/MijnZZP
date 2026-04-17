/**
 * Parse a bank CSV file (ING, ABN AMRO, Rabobank, or generic) into
 * an array of transaction objects.
 *
 * @param {string} text - Raw CSV file contents
 * @returns {Array<{date: string, amount: number, description: string, counterparty: string}>}
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  // 1. Strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  // 2. Handle Excel "sep=," directive on first line
  let lines = text.split(/\r?\n/);
  if (lines.length > 0 && /^sep=.$/i.test(lines[0].trim())) {
    lines = lines.slice(1);
  }

  // 3. Skip empty/blank lines at the start (empty strings, or only separators)
  while (lines.length > 0 && /^[\s,;\t]*$/.test(lines[0])) {
    lines = lines.slice(1);
  }

  if (lines.length < 2) {
    throw new Error('File appears empty or has no data rows after the header.');
  }

  // 4. Try all three separators and pick the one that produces the most non-empty header cells
  const candidates = ['\t', ';', ','];
  let best = { separator: ',', header: [], nonEmpty: 0 };
  for (const sep of candidates) {
    const hdr = splitRow(lines[0], sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const nonEmpty = hdr.filter((h) => h.length > 0).length;
    if (nonEmpty > best.nonEmpty) {
      best = { separator: sep, header: hdr, nonEmpty };
    }
  }

  const separator = best.separator;
  const header = best.header;

  // 5. If header cells are still all empty, we have a malformed file
  if (best.nonEmpty === 0) {
    const preview = lines.slice(0, 3).join(' | ').slice(0, 200);
    throw new Error(
      `First row is empty or unreadable. File preview: "${preview}". ` +
      `Try re-exporting the CSV from your bank.`
    );
  }

  const rows = lines.slice(1)
    .filter((line) => line.trim().length > 0) // skip fully blank data rows
    .map((line) => splitRow(line, separator).map((cell) => cell.trim().replace(/^['"]|['"]$/g, '')));

  // Detect column mapping
  const mapping = detectColumns(header);

  if (!mapping) {
    const err = new Error(
      `Could not detect required columns. Headers found: [${header.join(', ')}]. ` +
      `Need at least: date, amount, description.`
    );
    err.headers = header;
    throw err;
  }

  const transactions = [];

  for (const row of rows) {
    // Accept rows with fewer cells than header — pad with empty strings
    // (common in real-world CSVs where trailing empty fields are truncated)
    if (row.length < 2) continue;

    const rawDate = row[mapping.date] || '';
    const rawAmount = row[mapping.amount] || '';
    const rawDescription = mapping.description >= 0 ? (row[mapping.description] || '') : '';
    const rawCounterparty = mapping.counterparty !== null ? (row[mapping.counterparty] || '') : '';

    // Parse date
    const date = parseDate(rawDate);
    if (!date) continue;

    // Parse amount
    let amount = parseAmount(rawAmount);

    // Handle ING bij/af column (credit/debit indicator)
    if (mapping.bijAf !== null) {
      const bijAf = (row[mapping.bijAf] || '').toLowerCase().trim();
      // 'af' = debit (negative), 'bij' = credit (positive)
      amount = Math.abs(amount);
      if (bijAf === 'af') {
        amount = -amount;
      }
    }

    // Filter out zero-amount rows
    if (amount === 0) continue;

    transactions.push({
      date,
      amount,
      description: rawDescription.trim(),
      counterparty: rawCounterparty.trim(),
    });
  }

  return transactions;
}

/**
 * Detect the CSV separator (tab, semicolon, or comma).
 */
function detectSeparator(headerLine) {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;

  if (tabCount > semiCount && tabCount > commaCount) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

/**
 * Split a CSV row by separator, respecting quoted fields.
 */
function splitRow(line, separator) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === separator && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

/**
 * Detect column types from header names.
 * Returns column indices for date, amount, description, counterparty, and bijAf.
 */
function detectColumns(header) {
  let date = null;
  let amount = null;
  let description = null;
  let counterparty = null;
  let bijAf = null;

  for (let i = 0; i < header.length; i++) {
    const h = header[i];

    // Date columns
    if (date === null && /^(datum|date|boekingsdatum|transactiedatum|verwerkingsdatum|booking date|transaction date|trn date|trxdate)$/.test(h)) {
      date = i;
    }

    // Amount columns — also match "amount (usd)", "amount (eur)", etc.
    if (amount === null && /^(bedrag|amount|amount \(.+\)|transactiebedrag|bedrag \(eur\)|bedrag eur|bedrag euro|value|mutatie|trn amount|transaction amount|debit\/credit|price|cost|total)$/.test(h)) {
      amount = i;
    }

    // Description columns — expanded for generic expense logs
    if (description === null && /^(omschrijving|description|mededelingen|naam \/ omschrijving|naam\/omschrijving|omschrijving-1|detail|details|memo|reference|narration|note|notes|purpose|reason|merchant|vendor|employee name|employee|category|item|subject)$/.test(h)) {
      description = i;
    }

    // Counterparty columns
    if (counterparty === null && /^(tegenrekening|counterparty|tegenpartij|naam tegenpartij|tegenrekening iban|rekening tegenpartij|beneficiary|payee|iban\/bban|name|supplier|from|to)$/.test(h)) {
      counterparty = i;
    }

    // ING bij/af column
    if (bijAf === null && /^(af bij|af\/bij|debet\/credit|debit\/credit ind)$/.test(h)) {
      bijAf = i;
    }
  }

  // Fall back: if no description found, try broader substring matches
  if (description === null) {
    for (let i = 0; i < header.length; i++) {
      const h = header[i];
      if (h.includes('omschrijving') || h.includes('description') || h.includes('mededeling') ||
          h.includes('detail') || h.includes('memo') || h.includes('note') ||
          h.includes('name') || h.includes('merchant') || h.includes('vendor') ||
          h.includes('category') || h.includes('item') || h.includes('employee')) {
        description = i;
        break;
      }
    }
  }

  // Fall back: if no amount found, try broader substring matches
  if (amount === null) {
    for (let i = 0; i < header.length; i++) {
      if (header[i].includes('bedrag') || header[i].includes('amount') || header[i].includes('value') ||
          header[i].includes('price') || header[i].includes('cost') || header[i].includes('total')) {
        amount = i;
        break;
      }
    }
  }

  // Fall back: if no date found, try any column containing "datum" or "date"
  if (date === null) {
    for (let i = 0; i < header.length; i++) {
      if (header[i].includes('datum') || header[i].includes('date')) {
        date = i;
        break;
      }
    }
  }

  // Must have at least date and amount. Description is optional — will synthesize from other columns.
  if (date === null || amount === null) {
    return null;
  }

  // If no description or counterparty found, use any remaining text column as description
  if (description === null) {
    for (let i = 0; i < header.length; i++) {
      if (i !== date && i !== amount && i !== counterparty && i !== bijAf && header[i].length > 0) {
        description = i;
        break;
      }
    }
  }

  return {
    date,
    amount,
    description: description !== null ? description : -1, // -1 = use empty/synthesized
    counterparty: counterparty !== null ? counterparty : null,
    bijAf: bijAf !== null ? bijAf : null,
    // Extra context for synthesizing descriptions
    allHeaders: header,
  };
}

/**
 * Parse a Dutch-format date string into YYYY-MM-DD.
 * Supports: YYYYMMDD, DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
function parseDate(raw) {
  if (!raw) return null;

  const cleaned = raw.trim().replace(/['"]/g, '');

  // YYYYMMDD (e.g., 20240315)
  if (/^\d{8}$/.test(cleaned)) {
    const y = cleaned.slice(0, 4);
    const m = cleaned.slice(4, 6);
    const d = cleaned.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const match = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Parse a Dutch-format amount string to a number.
 * Handles both comma-as-decimal (1.234,56) and period-as-decimal (1,234.56).
 */
function parseAmount(raw) {
  if (!raw) return 0;

  let cleaned = raw.trim().replace(/['"]/g, '');

  // Detect Dutch format: dots as thousands separators, comma as decimal
  // e.g., "1.234,56" or "-1.234,56"
  if (/,\d{2}$/.test(cleaned) && /\./.test(cleaned)) {
    // Dutch format: remove dots (thousands), replace comma with period
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/,\d{2}$/.test(cleaned)) {
    // Just comma as decimal: "1234,56"
    cleaned = cleaned.replace(',', '.');
  }

  // Remove any remaining non-numeric chars except minus and period
  cleaned = cleaned.replace(/[^\d.\-]/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
