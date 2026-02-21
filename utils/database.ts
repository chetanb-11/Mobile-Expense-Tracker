import * as SQLite from 'expo-sqlite';

export interface Expense {
    id: number;
    amount: number;
    category: string;
    payment_method: string;
    note: string;
    date: string; // ISO string
    created_at: string;
}

export type NewExpense = Omit<Expense, 'id' | 'created_at'>;

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        db = await SQLite.openDatabaseAsync('expenses.db');
        await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        note TEXT DEFAULT '',
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);
    }
    return db;
}

// ─── Expense CRUD ────────────────────────────────────────

export async function addExpense(expense: NewExpense): Promise<number> {
    const d = await getDB();
    const result = await d.runAsync(
        'INSERT INTO expenses (amount, category, payment_method, note, date) VALUES (?, ?, ?, ?, ?)',
        [expense.amount, expense.category, expense.payment_method, expense.note, expense.date]
    );
    return result.lastInsertRowId;
}

export async function updateExpense(id: number, expense: NewExpense): Promise<void> {
    const d = await getDB();
    await d.runAsync(
        'UPDATE expenses SET amount = ?, category = ?, payment_method = ?, note = ?, date = ? WHERE id = ?',
        [expense.amount, expense.category, expense.payment_method, expense.note, expense.date, id]
    );
}

export async function deleteExpense(id: number): Promise<void> {
    const d = await getDB();
    await d.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

export async function getExpenseById(id: number): Promise<Expense | null> {
    const d = await getDB();
    const row = await d.getFirstAsync<Expense>('SELECT * FROM expenses WHERE id = ?', [id]);
    return row || null;
}

// ─── Queries ─────────────────────────────────────────────

export async function getAllExpenses(): Promise<Expense[]> {
    const d = await getDB();
    return d.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY date DESC, id DESC');
}

export async function getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const d = await getDB();
    return d.getAllAsync<Expense>(
        'SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC',
        [startDate, endDate]
    );
}

export async function getRecentExpenses(limit: number = 5): Promise<Expense[]> {
    const d = await getDB();
    return d.getAllAsync<Expense>(
        'SELECT * FROM expenses ORDER BY date DESC, id DESC LIMIT ?',
        [limit]
    );
}

// ─── Aggregations ────────────────────────────────────────

export async function getTotalByDateRange(startDate: string, endDate: string): Promise<number> {
    const d = await getDB();
    const row = await d.getFirstAsync<{ total: number | null }>(
        'SELECT SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ?',
        [startDate, endDate]
    );
    return row?.total ?? 0;
}

export async function getCategoryTotals(startDate: string, endDate: string): Promise<{ category: string; total: number }[]> {
    const d = await getDB();
    return d.getAllAsync<{ category: string; total: number }>(
        'SELECT category, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY category ORDER BY total DESC',
        [startDate, endDate]
    );
}

export async function getDailyTotals(startDate: string, endDate: string): Promise<{ date: string; total: number }[]> {
    const d = await getDB();
    return d.getAllAsync<{ date: string; total: number }>(
        `SELECT date(date) as date, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY date(date) ORDER BY date ASC`,
        [startDate, endDate]
    );
}

export async function getWeeklyTotals(startDate: string, endDate: string): Promise<{ week: string; total: number }[]> {
    const d = await getDB();
    return d.getAllAsync<{ week: string; total: number }>(
        `SELECT strftime('%Y-W%W', date) as week, SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY week ORDER BY week ASC`,
        [startDate, endDate]
    );
}

// ─── Settings ────────────────────────────────────────────

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
    const d = await getDB();
    const row = await d.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
    const d = await getDB();
    await d.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
    );
}

export async function getAllSettings(): Promise<Record<string, string>> {
    const d = await getDB();
    const rows = await d.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.key] = row.value;
    }
    return result;
}

// ─── Export / Wipe ───────────────────────────────────────

export async function getAllExpensesForExport(): Promise<Expense[]> {
    const d = await getDB();
    return d.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY date ASC');
}

export async function wipeAllData(): Promise<void> {
    const d = await getDB();
    await d.execAsync('DELETE FROM expenses; DELETE FROM settings;');
}
