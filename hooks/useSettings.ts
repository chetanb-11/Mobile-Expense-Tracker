import { getAllSettings, setSetting } from '@/utils/database';
import { useCallback, useEffect, useState } from 'react';

export interface AppSettings {
    currency: string;
    currencySymbol: string;
    monthlyBudget: string;
    defaultPaymentMethod: string;
    reminderEnabled: string;
    reminderTime: string;
    appLockEnabled: string;
    categoryBudgets: string; // JSON string
}

const DEFAULTS: AppSettings = {
    currency: 'INR',
    currencySymbol: '₹',
    monthlyBudget: '10000',
    defaultPaymentMethod: 'cash',
    reminderEnabled: 'false',
    reminderTime: '20:00',
    appLockEnabled: 'false',
    categoryBudgets: '{}',
};

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const all = await getAllSettings();
            if (!cancelled) {
                setSettings({
                    currency: all.currency ?? DEFAULTS.currency,
                    currencySymbol: all.currencySymbol ?? DEFAULTS.currencySymbol,
                    monthlyBudget: all.monthlyBudget ?? DEFAULTS.monthlyBudget,
                    defaultPaymentMethod: all.defaultPaymentMethod ?? DEFAULTS.defaultPaymentMethod,
                    reminderEnabled: all.reminderEnabled ?? DEFAULTS.reminderEnabled,
                    reminderTime: all.reminderTime ?? DEFAULTS.reminderTime,
                    appLockEnabled: all.appLockEnabled ?? DEFAULTS.appLockEnabled,
                    categoryBudgets: all.categoryBudgets ?? DEFAULTS.categoryBudgets,
                });
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [refreshKey]);

    const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
        await setSetting(key, value);
        setSettings((prev) => ({ ...prev, [key]: value }));
    }, []);

    return { settings, loading, refresh, updateSetting };
}
