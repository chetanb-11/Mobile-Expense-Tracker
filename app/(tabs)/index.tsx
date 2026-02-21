import { getCategoryById } from '@/constants/categories';
import { Colors } from '@/constants/colors';
import {
  deleteExpense,
  getCategoryTotals,
  getRecentExpenses,
  getSetting,
  getTotalByDateRange,
  type Expense,
} from '@/utils/database';
import { fp, hp, wp } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

function getToday() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  return { start, end };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { start, end };
}

export default function DashboardScreen() {
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [budget, setBudget] = useState(10000);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [catTotals, setCatTotals] = useState<{ category: string; total: number }[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadData = useCallback(async () => {
    const today = getToday();
    const month = getMonthRange();
    const [tt, mt, ct, recent, budgetVal, sym] = await Promise.all([
      getTotalByDateRange(today.start, today.end),
      getTotalByDateRange(month.start, month.end),
      getCategoryTotals(month.start, month.end),
      getRecentExpenses(5),
      getSetting('monthlyBudget', '10000'),
      getSetting('currencySymbol', '₹'),
    ]);
    setTodayTotal(tt);
    setMonthTotal(mt);
    setCatTotals(ct);
    setRecentExpenses(recent);
    setBudget(parseFloat(budgetVal) || 10000);
    setCurrencySymbol(sym);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20 }),
      ]).start();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDeleteExpense = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  }, [loadData]);

  const budgetProgress = budget > 0 ? Math.min(monthTotal / budget, 1) : 0;
  const budgetColor = budgetProgress > 0.9 ? Colors.dark.danger : budgetProgress > 0.7 ? Colors.dark.warning : Colors.dark.success;

  // Pie chart data
  const pieData = catTotals.length > 0
    ? catTotals.map((ct) => {
      const cat = getCategoryById(ct.category);
      return { value: ct.total, color: cat.color, text: cat.emoji, label: cat.label };
    })
    : [{ value: 1, color: Colors.dark.border, text: '', label: 'No data' }];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} colors={[Colors.dark.accent]} />
          }
        >
          {/* Header */}
          <Text style={styles.header}>Dashboard</Text>

          {/* Today's Total */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Today's Spending</Text>
            <Text style={styles.totalAmount}>{currencySymbol}{todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <View style={styles.monthRow}>
              <Ionicons name="calendar-outline" size={fp(14)} color={Colors.dark.textSecondary} />
              <Text style={styles.monthText}>This month: {currencySymbol}{monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            </View>
          </View>

          {/* Budget Progress */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Monthly Budget</Text>
              <Text style={[styles.budgetPercent, { color: budgetColor }]}>
                {Math.round(budgetProgress * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${budgetProgress * 100}%`, backgroundColor: budgetColor },
                ]}
              />
            </View>
            <Text style={styles.budgetSubtext}>
              {currencySymbol}{monthTotal.toLocaleString('en-IN')} of {currencySymbol}{budget.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Donut Chart */}
          {catTotals.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Category Breakdown</Text>
              <View style={styles.chartCenter}>
                <PieChart
                  data={pieData}
                  donut
                  radius={wp(80)}
                  innerRadius={wp(50)}
                  innerCircleColor={Colors.dark.surface}
                  centerLabelComponent={() => (
                    <View style={styles.donutCenter}>
                      <Text style={styles.donutCenterAmount}>{currencySymbol}{monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                      <Text style={styles.donutCenterLabel}>Total</Text>
                    </View>
                  )}
                />
              </View>
              {/* Legend */}
              <View style={styles.legendGrid}>
                {catTotals.slice(0, 6).map((ct) => {
                  const cat = getCategoryById(ct.category);
                  return (
                    <View key={ct.category} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.legendEmoji}>{cat.emoji}</Text>
                      <Text style={styles.legendLabel} numberOfLines={1}>{cat.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Recent Transactions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Transactions</Text>
            {recentExpenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses yet. Tap + to add one!</Text>
            ) : (
              recentExpenses.map((expense) => {
                const cat = getCategoryById(expense.category);
                const d = new Date(expense.date);
                return (
                  <Pressable
                    key={expense.id}
                    style={styles.txRow}
                    onLongPress={() => handleDeleteExpense(expense.id)}
                    android_ripple={{ color: 'rgba(124,58,237,0.1)' }}
                  >
                    <View style={[styles.txIcon, { backgroundColor: cat.color + '20' }]}>
                      <Text style={styles.txEmoji}>{cat.emoji}</Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txCategory}>{cat.label}</Text>
                      <Text style={styles.txNote} numberOfLines={1}>
                        {expense.note || d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.txAmount}>-{currencySymbol}{expense.amount.toLocaleString('en-IN')}</Text>
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={{ height: hp(100) }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: wp(20),
    paddingTop: hp(8),
  },
  header: {
    fontSize: fp(28),
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: hp(16),
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  totalCard: {
    backgroundColor: Colors.dark.accent,
    borderRadius: wp(20),
    padding: wp(24),
    marginBottom: hp(14),
  },
  totalLabel: {
    fontSize: fp(14),
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  totalAmount: {
    fontSize: fp(38),
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: hp(4),
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(8),
    gap: wp(4),
  },
  monthText: {
    fontSize: fp(13),
    color: 'rgba(255,255,255,0.7)',
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: wp(18),
    padding: wp(18),
    marginBottom: hp(14),
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(10),
  },
  cardTitle: {
    fontSize: fp(16),
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: hp(10),
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  budgetPercent: {
    fontSize: fp(16),
    fontWeight: '700',
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  progressTrack: {
    height: hp(8),
    borderRadius: 4,
    backgroundColor: Colors.dark.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetSubtext: {
    fontSize: fp(12),
    color: Colors.dark.textSecondary,
    marginTop: hp(6),
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  chartCenter: {
    alignItems: 'center',
    paddingVertical: hp(10),
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterAmount: {
    fontSize: fp(16),
    fontWeight: '700',
    color: Colors.dark.text,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  donutCenterLabel: {
    fontSize: fp(11),
    color: Colors.dark.textSecondary,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: hp(8),
    gap: wp(6),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '46%',
    paddingVertical: hp(3),
  },
  legendDot: {
    width: wp(8),
    height: wp(8),
    borderRadius: 4,
    marginRight: wp(6),
  },
  legendEmoji: {
    fontSize: fp(13),
    marginRight: wp(4),
  },
  legendLabel: {
    fontSize: fp(12),
    color: Colors.dark.textSecondary,
    flex: 1,
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(10),
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.background,
    minHeight: 48,
  },
  txIcon: {
    width: wp(42),
    height: wp(42),
    borderRadius: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(12),
  },
  txEmoji: {
    fontSize: fp(20),
  },
  txInfo: {
    flex: 1,
  },
  txCategory: {
    fontSize: fp(14),
    fontWeight: '600',
    color: Colors.dark.text,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  txNote: {
    fontSize: fp(12),
    color: Colors.dark.textMuted,
    marginTop: hp(2),
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
  txAmount: {
    fontSize: fp(15),
    fontWeight: '700',
    color: Colors.dark.danger,
    ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
  },
  emptyText: {
    fontSize: fp(14),
    color: Colors.dark.textMuted,
    textAlign: 'center',
    paddingVertical: hp(20),
    ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
  },
});
