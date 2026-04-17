/**
 * Parse a bank CSV file (ING, ABN AMRO, Rabobank, or generic) into
 * an array of transaction objects.
 *
 * @param {string} text - Raw CSV file contents
 * @returns {Array<{date: string, amount: number, description: string, counterparty: string}>}
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detect separator
  const separator = detectSeparator(lines[0]);

  // Parse header and rows
  const header = splitRow(lines[0], separator).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows = lines.slice(1).map((line) => splitRow(line, separator).map((cell) => cell.trim().replace(/^['"]|['"]$/g, '')));

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
    const rawDescription = row[mapping.description] || '';
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
    if (date === null && /^(datum|date|boekingsdatum|transactiedatum|verwerkingsdatum)$/.test(h)) {
      date = i;
    }

    // Amount columns
    if (amount === null && /^(bedrag|amount|transactiebedrag|bedrag \(eur\)|saldo na mutatie)$/.test(h)) {
      amount = i;
    }

    // Description columns
    if (description === null && /^(omschrijving|description|mededelingen|naam \/ omschrijving|naam\/omschrijving)$/.test(h)) {
      description = i;
    }

    // Counterparty columns
    if (counterparty === null && /^(tegenrekening|counterparty|tegenpartij|naam tegenpartij|tegenrekening iban|rekening tegenpartij)$/.test(h)) {
      counterparty = i;
    }

    // ING bij/af column
    if (bijAf === null && /^(af bij|af\/bij)$/.test(h)) {
      bijAf = i;
    }
  }

  // Fall back: if no description found, try broader matches
  if (description === null) {
    for (let i = 0; i < header.length; i++) {
      if (header[i].includes('omschrijving') || header[i].includes('description') || header[i].includes('mededeling')) {
        description = i;
        break;
      }
    }
  }

  // Must have at least date, amount, and description
  if (date === null || amount === null || description === null) {
    return null;
  }

  return { date, amount, description, counterparty: counterparty !== null ? counterparty : null, bijAf: bijAf !== null ? bijAf : null };
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
