-- MijnZZP Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- 1. Invoices
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  number TEXT,
  client TEXT,
  "clientEmail" TEXT,
  "clientAddress" TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  "vatRate" INTEGER DEFAULT 21,
  date TEXT,
  "dueDate" TEXT,
  status TEXT DEFAULT 'unpaid',
  lines JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Expenses
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  category TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  "vatRate" INTEGER DEFAULT 21,
  date TEXT,
  supplier TEXT,
  "isAsset" BOOLEAN DEFAULT false,
  "depYears" INTEGER DEFAULT 0,
  "residualValue" NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Quotes
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  number TEXT,
  client TEXT,
  "clientEmail" TEXT,
  "clientAddress" TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  "vatRate" INTEGER DEFAULT 21,
  date TEXT,
  "validUntil" TEXT,
  status TEXT DEFAULT 'draft',
  lines JSONB DEFAULT '[]',
  notes TEXT,
  "downPercent" INTEGER DEFAULT 0,
  "paymentDays" INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Personal items
CREATE TABLE personal_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  side TEXT,
  subtype TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Clients
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  notes TEXT,
  "followupDate" TEXT,
  "followupDone" BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  "clientId" TEXT,
  date TEXT,
  time TEXT,
  duration INTEGER,
  "sessionType" TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  "packageId" TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Packages
CREATE TABLE packages (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  "clientId" TEXT,
  name TEXT,
  "totalSessions" INTEGER,
  price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. User settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_quotes_date ON quotes(date);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_personal_items_date ON personal_items(date);
CREATE INDEX idx_personal_items_user ON personal_items(user_id);
CREATE INDEX idx_sessions_clientId ON sessions("clientId");
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_packages_clientId ON packages("clientId");
CREATE INDEX idx_packages_user ON packages(user_id);
CREATE INDEX idx_clients_user ON clients(user_id);

-- Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON quotes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON personal_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON packages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own data" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for receipt photos
-- Run this separately in Storage settings or via:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);
