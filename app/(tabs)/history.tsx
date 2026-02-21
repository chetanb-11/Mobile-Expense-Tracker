import { CATEGORIES, getCategoryById, PAYMENT_METHODS } from '@/constants/categories';
import { Colors } from '@/constants/colors';
import {
    deleteExpense,
    getAllExpenses,
    getExpensesByDateRange,
    getSetting,
    type Expense,
} from '@/utils/database';
import { fp, hp, wp } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

function getDateRange(period: FilterPeriod) {
    const now = new Date();
    switch (period) {
        case 'today': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
            return { start, end };
        }
        case 'week': {
            const day = now.getDay() || 7;
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
            return { start, end };
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
            return { start, end };
        }
        case 'all':
        default:
            return null;
    }
}

function formatDateHeader(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HistoryScreen() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [period, setPeriod] = useState<FilterPeriod>('all');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState('₹');
    const [showCatFilter, setShowCatFilter] = useState(false);
    const [showPayFilter, setShowPayFilter] = useState(false);

    const loadData = useCallback(async () => {
        const range = getDateRange(period);
        const data = range
            ? await getExpensesByDateRange(range.start, range.end)
            : await getAllExpenses();
        setExpenses(data);
        const sym = await getSetting('currencySymbol', '₹');
        setCurrencySymbol(sym);
    }, [period]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const handleDelete = useCallback((id: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Delete Expense', 'Remove this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    await deleteExpense(id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    loadData();
                },
            },
        ]);
    }, [loadData]);

    // Apply local filters
    const filtered = useMemo(() => {
        let result = expenses;
        if (categoryFilter) result = result.filter((e) => e.category === categoryFilter);
        if (paymentFilter) result = result.filter((e) => e.payment_method === paymentFilter);
        return result;
    }, [expenses, categoryFilter, paymentFilter]);

    // Group by date
    const sections = useMemo(() => {
        const groups: Record<string, Expense[]> = {};
        for (const e of filtered) {
            const key = new Date(e.date).toDateString();
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
        }
        return Object.entries(groups).map(([dateStr, data]) => ({
            title: formatDateHeader(dateStr),
            total: data.reduce((s, e) => s + e.amount, 0),
            data,
        }));
    }, [filtered]);

    const periods: { key: FilterPeriod; label: string }[] = [
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
        { key: 'all', label: 'All' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <Text style={styles.header}>History</Text>

            {/* Period Chips */}
            <View style={styles.chipRow}>
                {periods.map((p) => (
                    <Pressable
                        key={p.key}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPeriod(p.key); }}
                        style={[styles.filterChip, period === p.key && styles.filterChipActive]}
                        android_ripple={{ color: 'rgba(124,58,237,0.15)' }}
                    >
                        <Text style={[styles.filterChipText, period === p.key && styles.filterChipTextActive]}>{p.label}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Category & Payment Filters */}
            <View style={styles.chipRow}>
                <Pressable
                    onPress={() => setShowCatFilter(!showCatFilter)}
                    style={[styles.dropdownBtn, categoryFilter && styles.dropdownBtnActive]}
                    android_ripple={{ color: 'rgba(124,58,237,0.15)' }}
                >
                    <Ionicons name="grid-outline" size={fp(14)} color={categoryFilter ? Colors.dark.accent : Colors.dark.textSecondary} />
                    <Text style={[styles.dropdownText, categoryFilter && { color: Colors.dark.accent }]}>
                        {categoryFilter ? getCategoryById(categoryFilter).label : 'Category'}
                    </Text>
                    <Ionicons name="chevron-down" size={fp(14)} color={Colors.dark.textMuted} />
                </Pressable>

                <Pressable
                    onPress={() => setShowPayFilter(!showPayFilter)}
                    style={[styles.dropdownBtn, paymentFilter && styles.dropdownBtnActive]}
                    android_ripple={{ color: 'rgba(124,58,237,0.15)' }}
                >
                    <Ionicons name="card-outline" size={fp(14)} color={paymentFilter ? Colors.dark.accent : Colors.dark.textSecondary} />
                    <Text style={[styles.dropdownText, paymentFilter && { color: Colors.dark.accent }]}>
                        {paymentFilter ? PAYMENT_METHODS.find(p => p.id === paymentFilter)?.label : 'Payment'}
                    </Text>
                    <Ionicons name="chevron-down" size={fp(14)} color={Colors.dark.textMuted} />
                </Pressable>

                {(categoryFilter || paymentFilter) && (
                    <Pressable
                        onPress={() => { setCategoryFilter(null); setPaymentFilter(null); }}
                        style={styles.clearBtn}
                    >
                        <Ionicons name="close-circle" size={fp(18)} color={Colors.dark.danger} />
                    </Pressable>
                )}
            </View>

            {/* Category Dropdown */}
            {showCatFilter && (
                <View style={styles.dropdownPanel}>
                    <Pressable
                        onPress={() => { setCategoryFilter(null); setShowCatFilter(false); }}
                        style={styles.dropdownItem}
                    >
                        <Text style={styles.dropdownItemText}>All Categories</Text>
                    </Pressable>
                    {CATEGORIES.map((c) => (
                        <Pressable
                            key={c.id}
                            onPress={() => { setCategoryFilter(c.id); setShowCatFilter(false); }}
                            style={[styles.dropdownItem, categoryFilter === c.id && styles.dropdownItemActive]}
                        >
                            <Text style={styles.dropdownItemText}>{c.emoji} {c.label}</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Payment Dropdown */}
            {showPayFilter && (
                <View style={styles.dropdownPanel}>
                    <Pressable
                        onPress={() => { setPaymentFilter(null); setShowPayFilter(false); }}
                        style={styles.dropdownItem}
                    >
                        <Text style={styles.dropdownItemText}>All Methods</Text>
                    </Pressable>
                    {PAYMENT_METHODS.map((p) => (
                        <Pressable
                            key={p.id}
                            onPress={() => { setPaymentFilter(p.id); setShowPayFilter(false); }}
                            style={[styles.dropdownItem, paymentFilter === p.id && styles.dropdownItemActive]}
                        >
                            <Text style={styles.dropdownItemText}>{p.label}</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                stickySectionHeadersEnabled={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} colors={[Colors.dark.accent]} />
                }
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionTotal}>{currencySymbol}{section.total.toLocaleString('en-IN')}</Text>
                    </View>
                )}
                renderItem={({ item }) => {
                    const cat = getCategoryById(item.category);
                    const pm = PAYMENT_METHODS.find(p => p.id === item.payment_method);
                    const time = new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    return (
                        <Pressable
                            onLongPress={() => handleDelete(item.id)}
                            style={styles.txRow}
                            android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
                        >
                            <View style={[styles.txIcon, { backgroundColor: cat.color + '20' }]}>
                                <Text style={styles.txEmoji}>{cat.emoji}</Text>
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={styles.txCategory}>{cat.label}</Text>
                                <View style={styles.txMeta}>
                                    <Text style={styles.txNote} numberOfLines={1}>
                                        {item.note || time}
                                    </Text>
                                    <View style={styles.payBadge}>
                                        <Text style={styles.payBadgeText}>{pm?.label ?? 'Other'}</Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.txAmount}>-{currencySymbol}{item.amount.toLocaleString('en-IN')}</Text>
                        </Pressable>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Ionicons name="receipt-outline" size={fp(48)} color={Colors.dark.textMuted} />
                        <Text style={styles.emptyText}>No transactions found</Text>
                    </View>
                }
                ListFooterComponent={<View style={{ height: hp(100) }} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    header: {
        fontSize: fp(28), fontWeight: '700', color: Colors.dark.text,
        paddingHorizontal: wp(20), paddingTop: hp(8), paddingBottom: hp(8),
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    chipRow: {
        flexDirection: 'row', paddingHorizontal: wp(16), marginBottom: hp(6), gap: wp(6), flexWrap: 'wrap',
    },
    filterChip: {
        paddingHorizontal: wp(14), paddingVertical: hp(8), borderRadius: wp(16),
        backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, minHeight: 36,
    },
    filterChipActive: { backgroundColor: Colors.dark.accent + '25', borderColor: Colors.dark.accent },
    filterChipText: { fontSize: fp(13), color: Colors.dark.textSecondary, fontWeight: '500' },
    filterChipTextActive: { color: Colors.dark.accent, fontWeight: '600' },
    dropdownBtn: {
        flexDirection: 'row', alignItems: 'center', gap: wp(4),
        paddingHorizontal: wp(12), paddingVertical: hp(8), borderRadius: wp(12),
        backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, minHeight: 36,
    },
    dropdownBtnActive: { borderColor: Colors.dark.accent },
    dropdownText: { fontSize: fp(12), color: Colors.dark.textSecondary, fontWeight: '500' },
    clearBtn: { alignSelf: 'center', padding: wp(4) },
    dropdownPanel: {
        marginHorizontal: wp(16), backgroundColor: Colors.dark.surface, borderRadius: wp(14),
        borderWidth: 1, borderColor: Colors.dark.border, marginBottom: hp(8), overflow: 'hidden',
    },
    dropdownItem: { paddingHorizontal: wp(16), paddingVertical: hp(12), minHeight: 44 },
    dropdownItemActive: { backgroundColor: Colors.dark.accent + '15' },
    dropdownItemText: { fontSize: fp(14), color: Colors.dark.text },
    listContent: { paddingHorizontal: wp(16) },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: hp(10), paddingHorizontal: wp(4), marginTop: hp(8),
        borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
    },
    sectionTitle: {
        fontSize: fp(14), fontWeight: '600', color: Colors.dark.textSecondary,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    sectionTotal: {
        fontSize: fp(14), fontWeight: '700', color: Colors.dark.accent,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    txRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: hp(10),
        borderBottomWidth: 1, borderBottomColor: Colors.dark.background, minHeight: 48,
    },
    txIcon: {
        width: wp(42), height: wp(42), borderRadius: wp(12),
        alignItems: 'center', justifyContent: 'center', marginRight: wp(12),
    },
    txEmoji: { fontSize: fp(20) },
    txInfo: { flex: 1 },
    txCategory: {
        fontSize: fp(14), fontWeight: '600', color: Colors.dark.text,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    txMeta: { flexDirection: 'row', alignItems: 'center', marginTop: hp(3), gap: wp(6) },
    txNote: { fontSize: fp(12), color: Colors.dark.textMuted, flex: 1 },
    payBadge: {
        backgroundColor: Colors.dark.background, paddingHorizontal: wp(8), paddingVertical: hp(2),
        borderRadius: wp(6), borderWidth: 1, borderColor: Colors.dark.border,
    },
    payBadgeText: { fontSize: fp(10), color: Colors.dark.textSecondary, fontWeight: '500' },
    txAmount: {
        fontSize: fp(15), fontWeight: '700', color: Colors.dark.danger,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    emptyWrap: { alignItems: 'center', paddingTop: hp(60) },
    emptyText: {
        fontSize: fp(15), color: Colors.dark.textMuted, marginTop: hp(12),
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    },
});
