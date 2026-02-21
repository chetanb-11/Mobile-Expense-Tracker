import { CATEGORIES, CURRENCIES, PAYMENT_METHODS } from '@/constants/categories';
import { Colors } from '@/constants/colors';
import { useSettings } from '@/hooks/useSettings';
import { getAllExpensesForExport, wipeAllData, type Expense } from '@/utils/database';
import { fp, hp, wp } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function expensesToCSV(expenses: Expense[], symbol: string): string {
    const header = 'Date,Category,Amount,Payment Method,Note\n';
    const rows = expenses.map((e) =>
        `"${new Date(e.date).toLocaleDateString('en-IN')}","${e.category}","${symbol}${e.amount}","${e.payment_method}","${e.note || ''}"`
    ).join('\n');
    return header + rows;
}

export default function SettingsScreen() {
    const { settings, loading, updateSetting, refresh } = useSettings();
    const [editingBudget, setEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState('');
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showPaymentPicker, setShowPaymentPicker] = useState(false);
    const [showCategoryBudgets, setShowCategoryBudgets] = useState(false);

    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

    const handleCurrencySelect = useCallback(async (code: string, symbol: string) => {
        await updateSetting('currency', code);
        await updateSetting('currencySymbol', symbol);
        setShowCurrencyPicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [updateSetting]);

    const handlePaymentSelect = useCallback(async (id: string) => {
        await updateSetting('defaultPaymentMethod', id);
        setShowPaymentPicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [updateSetting]);

    const handleBudgetSave = useCallback(async () => {
        const val = parseFloat(budgetInput);
        if (val > 0) {
            await updateSetting('monthlyBudget', val.toString());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setEditingBudget(false);
    }, [budgetInput, updateSetting]);

    const handleToggleReminder = useCallback(async (val: boolean) => {
        await updateSetting('reminderEnabled', val.toString());
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [updateSetting]);

    const handleToggleAppLock = useCallback(async (val: boolean) => {
        if (val) {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !isEnrolled) {
                Alert.alert('Not Available', 'Biometric authentication is not set up on this device.');
                return;
            }
            const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Verify to enable app lock' });
            if (!result.success) return;
        }
        await updateSetting('appLockEnabled', val.toString());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [updateSetting]);

    const handleExportCSV = useCallback(async () => {
        const expenses = await getAllExpensesForExport();
        if (expenses.length === 0) {
            Alert.alert('No Data', 'No expenses to export.');
            return;
        }
        const csv = expensesToCSV(expenses, settings.currencySymbol);
        await Share.share({ message: csv, title: 'Expenses Export' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [settings.currencySymbol]);

    const handleWipeData = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
            'Wipe All Data',
            'This will permanently delete ALL expenses and settings. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: async () => {
                        await wipeAllData();
                        refresh();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Done', 'All data has been wiped.');
                    },
                },
            ]
        );
    }, [refresh]);

    const handleReminderTime = useCallback(async (time: string) => {
        await updateSetting('reminderTime', time);
    }, [updateSetting]);

    const selectedCurrency = CURRENCIES.find(c => c.code === settings.currency) || CURRENCIES[0];
    const selectedPayment = PAYMENT_METHODS.find(p => p.id === settings.defaultPaymentMethod) || PAYMENT_METHODS[2];

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Settings</Text>

                {/* Currency */}
                <Text style={styles.sectionLabel}>GENERAL</Text>
                <View style={styles.card}>
                    <Pressable style={styles.row} onPress={() => setShowCurrencyPicker(!showCurrencyPicker)} android_ripple={{ color: 'rgba(124,58,237,0.1)' }}>
                        <View style={styles.rowIcon}><Ionicons name="cash-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                        <Text style={styles.rowLabel}>Currency</Text>
                        <Text style={styles.rowValue}>{selectedCurrency.symbol} {selectedCurrency.code}</Text>
                        <Ionicons name="chevron-forward" size={fp(16)} color={Colors.dark.textMuted} />
                    </Pressable>
                    {showCurrencyPicker && (
                        <View style={styles.pickerPanel}>
                            {CURRENCIES.map((c) => (
                                <Pressable key={c.code} onPress={() => handleCurrencySelect(c.code, c.symbol)} style={[styles.pickerItem, settings.currency === c.code && styles.pickerItemActive]}>
                                    <Text style={styles.pickerItemText}>{c.symbol} {c.label} ({c.code})</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Default Payment Method */}
                    <Pressable style={styles.row} onPress={() => setShowPaymentPicker(!showPaymentPicker)} android_ripple={{ color: 'rgba(124,58,237,0.1)' }}>
                        <View style={styles.rowIcon}><Ionicons name="card-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                        <Text style={styles.rowLabel}>Default Payment</Text>
                        <Text style={styles.rowValue}>{selectedPayment.label}</Text>
                        <Ionicons name="chevron-forward" size={fp(16)} color={Colors.dark.textMuted} />
                    </Pressable>
                    {showPaymentPicker && (
                        <View style={styles.pickerPanel}>
                            {PAYMENT_METHODS.map((p) => (
                                <Pressable key={p.id} onPress={() => handlePaymentSelect(p.id)} style={[styles.pickerItem, settings.defaultPaymentMethod === p.id && styles.pickerItemActive]}>
                                    <Text style={styles.pickerItemText}>{p.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {/* Budget */}
                <Text style={styles.sectionLabel}>BUDGET</Text>
                <View style={styles.card}>
                    <Pressable style={styles.row} onPress={() => { setEditingBudget(!editingBudget); setBudgetInput(settings.monthlyBudget); }} android_ripple={{ color: 'rgba(124,58,237,0.1)' }}>
                        <View style={styles.rowIcon}><Ionicons name="wallet-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                        <Text style={styles.rowLabel}>Monthly Budget</Text>
                        <Text style={styles.rowValue}>{settings.currencySymbol}{parseFloat(settings.monthlyBudget).toLocaleString('en-IN')}</Text>
                        <Ionicons name="create-outline" size={fp(16)} color={Colors.dark.textMuted} />
                    </Pressable>
                    {editingBudget && (
                        <View style={styles.editRow}>
                            <TextInput
                                style={styles.editInput}
                                value={budgetInput}
                                onChangeText={setBudgetInput}
                                keyboardType="numeric"
                                selectionColor={Colors.dark.accent}
                                autoFocus
                            />
                            <Pressable style={styles.editSaveBtn} onPress={handleBudgetSave}>
                                <Text style={styles.editSaveBtnText}>Save</Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <Pressable style={styles.row} onPress={() => setShowCategoryBudgets(!showCategoryBudgets)} android_ripple={{ color: 'rgba(124,58,237,0.1)' }}>
                        <View style={styles.rowIcon}><Ionicons name="pie-chart-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                        <Text style={styles.rowLabel}>Category Budgets</Text>
                        <Ionicons name="chevron-forward" size={fp(16)} color={Colors.dark.textMuted} />
                    </Pressable>
                    {showCategoryBudgets && (
                        <View style={styles.catBudgetPanel}>
                            {CATEGORIES.map((cat) => {
                                const budgets = JSON.parse(settings.categoryBudgets || '{}');
                                return (
                                    <View key={cat.id} style={styles.catBudgetRow}>
                                        <Text style={styles.catBudgetEmoji}>{cat.emoji}</Text>
                                        <Text style={styles.catBudgetLabel}>{cat.label}</Text>
                                        <TextInput
                                            style={styles.catBudgetInput}
                                            defaultValue={budgets[cat.id]?.toString() || ''}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor={Colors.dark.textMuted}
                                            selectionColor={Colors.dark.accent}
                                            onEndEditing={(e) => {
                                                const val = e.nativeEvent.text;
                                                const updated = { ...budgets, [cat.id]: parseFloat(val) || 0 };
                                                updateSetting('categoryBudgets', JSON.stringify(updated));
                                            }}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Notifications */}
                <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowIcon}><Ionicons name="notifications-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                        <Text style={styles.rowLabel}>Daily Reminder</Text>
                        <Switch
                            value={settings.reminderEnabled === 'true'}
                            onValueChange={handleToggleReminder}
                            trackColor={{ false: Colors.dark.background, true: Colors.dark.accent + '60' }}
                            thumbColor={settings.reminderEnabled === 'true' ? Colors.dark.accent : Colors.dark.textMuted}
                        />
                    </View>
                    {settings.reminderEnabled === 'true' && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <View style={styles.rowIcon}><Ionicons name="time-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                                <Text style={styles.rowLabel}>Reminder Time</Text>
                                <Text style={styles.rowValue}>{settings.reminderTime}</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Security */}
                <Text style={styles.sectionLabel}>SECURITY</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowIcon}><Ionicons name="finger-print-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                        <Text style={styles.rowLabel}>Biometric Lock</Text>
                        <Switch
                            value={settings.appLockEnabled === 'true'}
                            onValueChange={handleToggleAppLock}
                            trackColor={{ false: Colors.dark.background, true: Colors.dark.accent + '60' }}
                            thumbColor={settings.appLockEnabled === 'true' ? Colors.dark.accent : Colors.dark.textMuted}
                        />
                    </View>
                </View>

                {/* Data */}
                <Text style={styles.sectionLabel}>DATA</Text>
                <View style={styles.card}>
                    <Pressable style={styles.row} onPress={handleExportCSV} android_ripple={{ color: 'rgba(124,58,237,0.1)' }}>
                        <View style={styles.rowIcon}><Ionicons name="download-outline" size={fp(20)} color={Colors.dark.accent} /></View>
                        <Text style={styles.rowLabel}>Export as CSV</Text>
                        <Ionicons name="chevron-forward" size={fp(16)} color={Colors.dark.textMuted} />
                    </Pressable>
                    <View style={styles.divider} />
                    <Pressable style={styles.row} onPress={handleWipeData} android_ripple={{ color: 'rgba(239,68,68,0.1)' }}>
                        <View style={[styles.rowIcon, { backgroundColor: Colors.dark.danger + '15' }]}>
                            <Ionicons name="trash-outline" size={fp(20)} color={Colors.dark.danger} />
                        </View>
                        <Text style={[styles.rowLabel, { color: Colors.dark.danger }]}>Wipe All Data</Text>
                        <Ionicons name="chevron-forward" size={fp(16)} color={Colors.dark.textMuted} />
                    </Pressable>
                </View>

                <View style={{ height: hp(100) }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    scrollContent: { paddingHorizontal: wp(16), paddingTop: hp(8) },
    header: {
        fontSize: fp(28), fontWeight: '700', color: Colors.dark.text,
        marginBottom: hp(8), paddingHorizontal: wp(4),
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    sectionLabel: {
        fontSize: fp(12), fontWeight: '600', color: Colors.dark.textMuted,
        marginTop: hp(16), marginBottom: hp(6), paddingHorizontal: wp(4),
        letterSpacing: 1,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    card: {
        backgroundColor: Colors.dark.surface, borderRadius: wp(16),
        borderWidth: 1, borderColor: Colors.dark.border, overflow: 'hidden',
    },
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: wp(16), paddingVertical: hp(14), minHeight: 52, gap: wp(12),
    },
    rowIcon: {
        width: wp(36), height: wp(36), borderRadius: wp(10),
        backgroundColor: Colors.dark.accent + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: {
        flex: 1, fontSize: fp(15), color: Colors.dark.text, fontWeight: '500',
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    rowValue: {
        fontSize: fp(14), color: Colors.dark.textSecondary, fontWeight: '500',
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    },
    divider: { height: 1, backgroundColor: Colors.dark.border, marginHorizontal: wp(16) },
    pickerPanel: {
        backgroundColor: Colors.dark.background, marginHorizontal: wp(12),
        borderRadius: wp(12), marginBottom: hp(8), overflow: 'hidden',
    },
    pickerItem: { paddingHorizontal: wp(16), paddingVertical: hp(12), minHeight: 44 },
    pickerItemActive: { backgroundColor: Colors.dark.accent + '15' },
    pickerItemText: { fontSize: fp(14), color: Colors.dark.text },
    editRow: {
        flexDirection: 'row', alignItems: 'center', gap: wp(8),
        paddingHorizontal: wp(16), paddingBottom: hp(12),
    },
    editInput: {
        flex: 1, backgroundColor: Colors.dark.background, borderRadius: wp(10),
        paddingHorizontal: wp(14), paddingVertical: hp(10), fontSize: fp(16),
        color: Colors.dark.text, borderWidth: 1, borderColor: Colors.dark.border,
    },
    editSaveBtn: {
        backgroundColor: Colors.dark.accent, paddingHorizontal: wp(18), paddingVertical: hp(10),
        borderRadius: wp(10), minHeight: 44, justifyContent: 'center',
    },
    editSaveBtnText: { fontSize: fp(14), fontWeight: '600', color: '#FFF' },
    catBudgetPanel: {
        paddingHorizontal: wp(16), paddingBottom: hp(12),
    },
    catBudgetRow: {
        flexDirection: 'row', alignItems: 'center', gap: wp(8), paddingVertical: hp(6),
    },
    catBudgetEmoji: { fontSize: fp(18) },
    catBudgetLabel: { flex: 1, fontSize: fp(13), color: Colors.dark.text },
    catBudgetInput: {
        width: wp(80), backgroundColor: Colors.dark.background, borderRadius: wp(8),
        paddingHorizontal: wp(10), paddingVertical: hp(6), fontSize: fp(14),
        color: Colors.dark.text, textAlign: 'right', borderWidth: 1, borderColor: Colors.dark.border,
    },
});
