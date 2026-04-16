import {
  ZELFSTANDIGENAFTREK,
  STARTERSAFTREK,
  MKB_PERCENTAGE,
  HOURS_CRITERION,
} from '../constants/tax';

/**
 * Calculate Box 1 income for Dutch ZZP'er.
 * revenue: total invoiced revenue (ex VAT)
 * expenses: total deductible expenses (ex VAT)
 * depTotal: total depreciation for the year
 * hoursmet: whether the hours criterion (>=1225) is met
 * isStarter: whether eligible for startersaftrek
 */
export function calcBox1(revenue, expenses, depTotal, hoursmet, isStarter) {
  const gross = revenue - expenses - depTotal;

  let sed = 0;
  if (hoursmet) {
    sed = ZELFSTANDIGENAFTREK;
    if (isStarter) {
      sed += STARTERSAFTREK;
    }
  }

  const sd = Math.max(gross - sed, 0);
  const mkb = sd * MKB_PERCENTAGE;
  const taxable = Math.max(sd - mkb, 0);

  return { gross, sed, sd, mkb, taxable };
}

/**
 * Summarise VAT collected (on invoices) and paid (on expenses).
 */
export function calcVatSummary(invoices, expenses) {
  let collected = 0;
  let paid = 0;

  for (const inv of invoices) {
    collected += (inv.amount || 0) * ((inv.vatRate || 21) / 100);
  }

  for (const exp of expenses) {
    paid += (exp.amount || 0) * ((exp.vatRate || 21) / 100);
  }

  return {
    collected,
    paid,
    owed: collected - paid,
  };
}

/**
 * Calculate quarterly BTW (VAT) returns.
 * Returns array of 4 objects for Q1-Q4.
 */
export function calcQuarterlyBtw(invoices, expenses) {
  const quarters = [0, 1, 2, 3].map(() => ({
    vat21: 0,
    vat9: 0,
    inputVat: 0,
    total: 0,
  }));

  for (const inv of invoices) {
    const month = parseInt(inv.date?.slice(5, 7), 10) || 1;
    const q = Math.floor((month - 1) / 3);
    const vatAmount = (inv.amount || 0) * ((inv.vatRate || 21) / 100);
    if (inv.vatRate === 9) {
      quarters[q].vat9 += vatAmount;
    } else {
      quarters[q].vat21 += vatAmount;
    }
  }

  for (const exp of expenses) {
    const month = parseInt(exp.date?.slice(5, 7), 10) || 1;
    const q = Math.floor((month - 1) / 3);
    quarters[q].inputVat += (exp.amount || 0) * ((exp.vatRate || 21) / 100);
  }

  for (const q of quarters) {
    q.total = q.vat21 + q.vat9 - q.inputVat;
  }

  return quarters;
}

/**
 * Calculate annual depreciation for an asset in a given year.
 * Uses straight-line depreciation: (cost - residualValue) / depYears
 * Only returns a value if the year falls within the depreciation period.
 */
export function calcDepreciation(expense, year) {
  if (!expense.isAsset || !expense.depYears || expense.depYears <= 0) return 0;

  const purchaseYear = parseInt(expense.date?.slice(0, 4), 10);
  if (!purchaseYear || isNaN(purchaseYear)) return 0;

  const yearIndex = year - purchaseYear;
  if (yearIndex < 0 || yearIndex >= expense.depYears) return 0;

  const depreciable = (expense.amount || 0) - (expense.residualValue || 0);
  return Math.max(depreciable / expense.depYears, 0);
}
