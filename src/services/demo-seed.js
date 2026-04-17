// Seed a new user's account with demo data so they can explore features.
// Inserts: 1 client, 2 invoices, 10 sample expenses, 3 personal items.

import { mockExpenses } from '../data/mockExpenses';
import { genId } from '../utils/id';
import * as db from '../lib/db';

const CATEGORY_MAP = {
  travel: 'travel',
  software: 'software',
  representation: 'representation',
  office: 'office',
  equipment: 'equipment',
};

export async function seedDemoData() {
  const year = new Date().getFullYear();
  const currentYear = String(year);

  // 1. Sample client
  const client = {
    id: genId(),
    name: 'Acme Studios BV',
    email: 'invoice@acme.example',
    phone: '+31 20 123 4567',
    company: 'Acme Studios BV',
    address: 'Keizersgracht 100\n1015 CW Amsterdam',
    notes: 'Demo client. Safe to delete.',
    followupDate: null,
  };
  await db.insertClient(client);

  // 2. Sample invoices
  const invoice1 = {
    id: genId(),
    number: `DEMO-${currentYear}-001`,
    client: client.name,
    clientEmail: client.email,
    clientAddress: client.address,
    description: 'Consulting services',
    amount: 2400,
    vatRate: 21,
    date: `${currentYear}-02-15`,
    dueDate: `${currentYear}-03-15`,
    status: 'paid',
    lines: [
      { description: 'Strategy session — 8 hours', qty: 8, unitPrice: 150 },
      { description: 'Follow-up report', qty: 1, unitPrice: 1200 },
    ],
    notes: 'Demo invoice',
  };
  const invoice2 = {
    id: genId(),
    number: `DEMO-${currentYear}-002`,
    client: client.name,
    clientEmail: client.email,
    clientAddress: client.address,
    description: 'Design work',
    amount: 3500,
    vatRate: 21,
    date: `${currentYear}-04-02`,
    dueDate: `${currentYear}-05-02`,
    status: 'unpaid',
    lines: [
      { description: 'Logo design', qty: 1, unitPrice: 1500 },
      { description: 'Brand guidelines', qty: 1, unitPrice: 2000 },
    ],
    notes: 'Demo invoice',
  };
  await db.insertInvoice(invoice1);
  await db.insertInvoice(invoice2);

  // 3. Sample expenses (first 10 from mock data, converted to ZZP format, current-year dates)
  const firstTen = mockExpenses.slice(0, 10);
  for (let i = 0; i < firstTen.length; i++) {
    const m = firstTen[i];
    const month = String(((i % 10) + 1)).padStart(2, '0');
    const day = String(((i * 3) % 28) + 1).padStart(2, '0');
    await db.insertExpense({
      id: genId(),
      category: CATEGORY_MAP[m.category] || 'other',
      description: `Demo: ${m.employee}`,
      amount: m.amount,
      vatRate: 21,
      date: `${currentYear}-${month}-${day}`,
      supplier: m.department,
      isAsset: false,
      depYears: 0,
      residualValue: 0,
    });
  }

  // 4. Sample personal items
  const personals = [
    {
      id: genId(),
      side: 'income',
      subtype: 'salary',
      description: 'Demo side-gig income',
      amount: 1500,
      date: `${currentYear}-01-15`,
    },
    {
      id: genId(),
      side: 'expense',
      subtype: 'groceries',
      description: 'Demo household',
      amount: 250,
      date: `${currentYear}-01-20`,
    },
    {
      id: genId(),
      side: 'expense',
      subtype: 'utilities',
      description: 'Demo utilities',
      amount: 180,
      date: `${currentYear}-02-01`,
    },
  ];
  for (const p of personals) {
    await db.insertPersonalItem(p);
  }

  return {
    clients: 1,
    invoices: 2,
    expenses: firstTen.length,
    personalItems: personals.length,
  };
}
