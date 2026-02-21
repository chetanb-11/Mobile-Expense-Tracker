import { getCategoryById } from '@/constants/categories';
import { Colors } from '@/constants/colors';
import {
    getCategoryTotals,
    getDailyTotals,
    getSetting,
    getTotalByDateRange
} from '@/utils/database';
import { fp, hp, wp } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

function getMonthRange(offset = 0) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59).toISOString();
    return { start, end };
}

function get30DayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    return { start, end };
}

function getWeekRange(offset = 0) {
    const now = new Date();
    const day = now.getDay() || 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1 + offset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
}

export default function InsightsScreen() {
    const [catTotals, setCatTotals] = useState<{ category: string; total: number }[]>([]);
    const [dailyTotals, setDailyTotals] = useState<{ date: string; total: number }[]>([]);
    const [thisWeekTotal, setThisWeekTotal] = useState(0);
    const [lastWeekTotal, setLastWeekTotal] = useState(0);
    const [currencySymbol, setCurrencySymbol] = useState('₹');
    const [heatmapData, setHeatmapData] = useState<{ date: string; total: number }[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        const month = getMonthRange();
        const thirtyDay = get30DayRange();
        const thisWeek = getWeekRange(0);
        const lastWeek = getWeekRange(-1);

        const [ct, dt, twt, lwt, sym, hm] = await Promise.all([
            getCategoryTotals(month.start, month.end),
            getDailyTotals(thirtyDay.start, thirtyDay.end),
            getTotalByDateRange(thisWeek.start, thisWeek.end),
            getTotalByDateRange(lastWeek.start, lastWeek.end),
            getSetting('currencySymbol', '₹'),
            getDailyTotals(month.start, month.end),
        ]);
        setCatTotals(ct);
        setDailyTotals(dt);
        setThisWeekTotal(twt);
        setLastWeekTotal(lwt);
        setCurrencySymbol(sym);
        setHeatmapData(hm);
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const monthTotal = catTotals.reduce((s, c) => s + c.total, 0);

    // Bar chart data
    const barData = catTotals.slice(0, 6).map((ct) => {
        const cat = getCategoryById(ct.category);
        return { value: ct.total, label: cat.emoji, frontColor: cat.color, topLabelComponent: () => <Text style={styles.barTopLabel}>{currencySymbol}{Math.round(ct.total)}</Text> };
    });

    // Pie chart data
    const pieData = catTotals.length > 0
        ? catTotals.map((ct) => {
            const cat = getCategoryById(ct.category);
            return { value: ct.total, color: cat.color, text: cat.emoji };
        })
        : [{ value: 1, color: Colors.dark.border, text: '' }];

    // Line chart data (30 days)
    const lineData = dailyTotals.map((dt) => ({
        value: dt.total,
        label: new Date(dt.date).getDate().toString(),
        dataPointText: '',
    }));

    // Week comparison
    const weekChange = lastWeekTotal > 0
        ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
        : thisWeekTotal > 0 ? 100 : 0;

    // Heatmap: build calendar grid for current month
    const heatmapGrid = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const maxDaily = Math.max(...heatmapData.map(d => d.total), 1);

        const cells: { day: number; intensity: number; amount: number }[] = [];
        // empty leading cells
        for (let i = 0; i < firstDay; i++) cells.push({ day: 0, intensity: 0, amount: 0 });

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const entry = heatmapData.find(h => h.date === dateStr);
            const amount = entry?.total ?? 0;
            cells.push({ day: d, intensity: amount / maxDaily, amount });
        }
        return cells;
    }, [heatmapData]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} colors={[Colors.dark.accent]} />}
            >
                <Text style={styles.header}>Insights</Text>

                {/* Bar Chart */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Spending by Category</Text>
                    {barData.length > 0 ? (
                        <View style={styles.chartWrap}>
                            <BarChart
                                data={barData}
                                barWidth={wp(28)}
                                spacing={wp(16)}
                                noOfSections={4}
                                barBorderRadius={6}
                                yAxisThickness={0}
                                xAxisThickness={1}
                                xAxisColor={Colors.dark.border}
                                yAxisTextStyle={{ color: Colors.dark.textMuted, fontSize: fp(10) }}
                                xAxisLabelTextStyle={{ color: Colors.dark.textSecondary, fontSize: fp(14) }}
                                hideRules
                                height={hp(160)}
                                maxValue={Math.max(...barData.map(d => d.value)) * 1.2 || 100}
                            />
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>No data for this month</Text>
                    )}
                </View>

                {/* Pie Chart */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Category Breakdown</Text>
                    <View style={styles.chartCenter}>
                        <PieChart
                            data={pieData}
                            donut
                            radius={wp(75)}
                            innerRadius={wp(48)}
                            innerCircleColor={Colors.dark.surface}
                            centerLabelComponent={() => (
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={styles.pieCenter}>{currencySymbol}{monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                                </View>
                            )}
                        />
                    </View>
                    {/* Top categories ranked */}
                    {catTotals.slice(0, 5).map((ct, i) => {
                        const cat = getCategoryById(ct.category);
                        const pct = monthTotal > 0 ? Math.round((ct.total / monthTotal) * 100) : 0;
                        return (
                            <View key={ct.category} style={styles.rankRow}>
                                <Text style={styles.rankNum}>#{i + 1}</Text>
                                <Text style={styles.rankEmoji}>{cat.emoji}</Text>
                                <Text style={styles.rankLabel}>{cat.label}</Text>
                                <View style={styles.rankBarTrack}>
                                    <View style={[styles.rankBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                                </View>
                                <Text style={styles.rankAmount}>{pct}%</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Week-over-Week */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Week-over-Week</Text>
                    <View style={styles.wowRow}>
                        <View style={styles.wowCol}>
                            <Text style={styles.wowLabel}>This Week</Text>
                            <Text style={styles.wowValue}>{currencySymbol}{thisWeekTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                        <View style={styles.wowDivider} />
                        <View style={styles.wowCol}>
                            <Text style={styles.wowLabel}>Last Week</Text>
                            <Text style={styles.wowValue}>{currencySymbol}{lastWeekTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                        <View style={[styles.wowBadge, { backgroundColor: weekChange > 0 ? Colors.dark.danger + '20' : Colors.dark.success + '20' }]}>
                            <Ionicons
                                name={weekChange > 0 ? 'arrow-up' : weekChange < 0 ? 'arrow-down' : 'remove'}
                                size={fp(14)}
                                color={weekChange > 0 ? Colors.dark.danger : Colors.dark.success}
                            />
                            <Text style={[styles.wowChange, { color: weekChange > 0 ? Colors.dark.danger : Colors.dark.success }]}>
                                {Math.abs(weekChange)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Spending Heatmap */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Spending Heatmap</Text>
                    <View style={styles.dayLabels}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <Text key={i} style={styles.dayLabel}>{d}</Text>
                        ))}
                    </View>
                    <View style={styles.heatmapGrid}>
                        {heatmapGrid.map((cell, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.heatmapCell,
                                    cell.day === 0 && styles.heatmapEmpty,
                                    cell.day > 0 && {
                                        backgroundColor: cell.intensity > 0
                                            ? `rgba(124, 58, 237, ${Math.max(cell.intensity * 0.9, 0.1)})`
                                            : Colors.dark.background,
                                    },
                                ]}
                            >
                                {cell.day > 0 && <Text style={styles.heatmapDay}>{cell.day}</Text>}
                            </View>
                        ))}
                    </View>
                </View>

                {/* 30-Day Line Chart */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>30-Day Cashflow</Text>
                    {lineData.length > 1 ? (
                        <View style={styles.chartWrap}>
                            <LineChart
                                data={lineData}
                                curved
                                color={Colors.dark.accent}
                                thickness={2}
                                dataPointsColor={Colors.dark.accent}
                                dataPointsRadius={3}
                                yAxisThickness={0}
                                xAxisThickness={1}
                                xAxisColor={Colors.dark.border}
                                yAxisTextStyle={{ color: Colors.dark.textMuted, fontSize: fp(10) }}
                                xAxisLabelTextStyle={{ color: Colors.dark.textMuted, fontSize: fp(8) }}
                                hideRules
                                height={hp(140)}
                                areaChart
                                startFillColor={Colors.dark.accent}
                                endFillColor={Colors.dark.background}
                                startOpacity={0.3}
                                endOpacity={0.05}
                                noOfSections={4}
                                spacing={wp(Math.max(280 / lineData.length, 12))}
                            />
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>Need more data for trend</Text>
                    )}
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
        marginBottom: hp(14), paddingHorizontal: wp(4),
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    card: {
        backgroundColor: Colors.dark.surface, borderRadius: wp(18), padding: wp(18),
        marginBottom: hp(14), borderWidth: 1, borderColor: Colors.dark.border,
    },
    cardTitle: {
        fontSize: fp(16), fontWeight: '600', color: Colors.dark.text, marginBottom: hp(12),
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    chartWrap: { alignItems: 'center', paddingVertical: hp(4), overflow: 'hidden' },
    chartCenter: { alignItems: 'center', paddingVertical: hp(8) },
    pieCenter: {
        fontSize: fp(14), fontWeight: '700', color: Colors.dark.text,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    barTopLabel: {
        fontSize: fp(9), color: Colors.dark.textSecondary, marginBottom: hp(4),
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    },
    emptyText: {
        fontSize: fp(13), color: Colors.dark.textMuted, textAlign: 'center', paddingVertical: hp(16),
    },
    rankRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: hp(6), gap: wp(6), minHeight: 36,
    },
    rankNum: { fontSize: fp(12), fontWeight: '700', color: Colors.dark.textMuted, width: wp(24) },
    rankEmoji: { fontSize: fp(16) },
    rankLabel: { fontSize: fp(13), color: Colors.dark.text, width: wp(80) },
    rankBarTrack: {
        flex: 1, height: hp(6), borderRadius: 3, backgroundColor: Colors.dark.background, overflow: 'hidden',
    },
    rankBarFill: { height: '100%', borderRadius: 3 },
    rankAmount: {
        fontSize: fp(12), fontWeight: '600', color: Colors.dark.textSecondary, width: wp(36), textAlign: 'right',
    },
    wowRow: { flexDirection: 'row', alignItems: 'center', gap: wp(12) },
    wowCol: { flex: 1, alignItems: 'center' },
    wowLabel: { fontSize: fp(12), color: Colors.dark.textSecondary, marginBottom: hp(4) },
    wowValue: {
        fontSize: fp(18), fontWeight: '700', color: Colors.dark.text,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    wowDivider: { width: 1, height: hp(32), backgroundColor: Colors.dark.border },
    wowBadge: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: wp(10), paddingVertical: hp(6),
        borderRadius: wp(12), gap: wp(2),
    },
    wowChange: { fontSize: fp(13), fontWeight: '700' },
    dayLabels: {
        flexDirection: 'row', marginBottom: hp(4),
    },
    dayLabel: {
        flex: 1, textAlign: 'center', fontSize: fp(10), color: Colors.dark.textMuted, fontWeight: '600',
    },
    heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    heatmapCell: {
        width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
        borderRadius: wp(6), marginBottom: wp(2),
    },
    heatmapEmpty: { backgroundColor: 'transparent' },
    heatmapDay: { fontSize: fp(10), color: Colors.dark.textSecondary },
});
