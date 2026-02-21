import {
    addExpense,
    deleteExpense,
    getAllExpenses,
    getCategoryTotals,
    getDailyTotals,
    getExpensesByDateRange,
    getRecentExpenses,
    getTotalByDateRange,
    updateExpense,
    type Expense,
    type NewExpense,
} from '@/utils/database';
import { useCallback, useEffect, useState } from 'react';

export function useExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const data = await getAllExpenses();
            if (!cancelled) {
                setExpenses(data);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [refreshKey]);

    const add = useCallback(async (expense: NewExpense) => {
        const id = await addExpense(expense);
        refresh();
        return id;
    }, [refresh]);

    const remove = useCallback(async (id: number) => {
        await deleteExpense(id);
        refresh();
    }, [refresh]);

    const update = useCallback(async (id: number, expense: NewExpense) => {
        await updateExpense(id, expense);
        refresh();
    }, [refresh]);

    return { expenses, loading, refresh, add, remove, update };
}

export function useRecentExpenses(limit: number = 5) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const data = await getRecentExpenses(limit);
            if (!cancelled) {
                setExpenses(data);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [refreshKey, limit]);

    return { expenses, loading, refresh };
}

export function useDateRangeExpenses(startDate: string, endDate: string) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const data = await getExpensesByDateRange(startDate, endDate);
            if (!cancelled) {
                setExpenses(data);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [refreshKey, startDate, endDate]);

    return { expenses, loading, refresh };
}

export function useTotals(startDate: string, endDate: string) {
    const [total, setTotal] = useState(0);
    const [categoryTotals, setCategoryTotals] = useState<{ category: string; total: number }[]>([]);
    const [dailyTotals, setDailyTotals] = useState<{ date: string; total: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const [t, ct, dt] = await Promise.all([
                getTotalByDateRange(startDate, endDate),
                getCategoryTotals(startDate, endDate),
                getDailyTotals(startDate, endDate),
            ]);
            if (!cancelled) {
                setTotal(t);
                setCategoryTotals(ct);
                setDailyTotals(dt);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [refreshKey, startDate, endDate]);

    return { total, categoryTotals, dailyTotals, loading, refresh };
}
