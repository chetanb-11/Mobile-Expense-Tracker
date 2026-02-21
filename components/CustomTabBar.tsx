import AddExpenseSheet from '@/components/AddExpenseSheet';
import { Colors } from '@/constants/colors';
import { fp, hp, wp } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; focused: keyof typeof Ionicons.glyphMap }> = {
    index: { default: 'grid-outline', focused: 'grid' },
    history: { default: 'time-outline', focused: 'time' },
    insights: { default: 'pie-chart-outline', focused: 'pie-chart' },
    settings: { default: 'settings-outline', focused: 'settings' },
};

const MIN_TOUCH_TARGET = 48;
const TAB_ICON_SIZE = fp(24);
const FAB_SIZE = wp(58);
const FAB_ICON_SIZE = fp(28);

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const [sheetVisible, setSheetVisible] = useState(false);

    const bottomPadding = Platform.OS === 'android'
        ? Math.max(insets.bottom, 12)
        : Math.max(insets.bottom, 24);

    const handlePress = useCallback((routeName: string, routeKey: string, isFocused: boolean) => {
        const event = navigation.emit({
            type: 'tabPress',
            target: routeKey,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(routeName);
        }
    }, [navigation]);

    const handleFabPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSheetVisible(true);
    }, []);

    const handleSheetClose = useCallback(() => {
        setSheetVisible(false);
    }, []);

    const handleExpenseSaved = useCallback(() => {
        navigation.navigate('index');
    }, [navigation]);

    // Split tabs into left (before FAB) and right (after FAB)
    const routes = state.routes;
    const midPoint = Math.floor(routes.length / 2);

    const renderTab = (route: typeof routes[number], index: number) => {
        const isFocused = state.index === index;
        const iconConfig = TAB_ICONS[route.name];
        if (!iconConfig) return null;

        return (
            <Pressable
                key={route.key}
                onPress={() => handlePress(route.name, route.key, isFocused)}
                android_ripple={{
                    color: 'rgba(124, 58, 237, 0.15)',
                    borderless: true,
                    radius: 28,
                }}
                style={styles.tab}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
                <Ionicons
                    name={isFocused ? iconConfig.focused : iconConfig.default}
                    size={TAB_ICON_SIZE}
                    color={isFocused ? Colors.dark.accent : Colors.dark.textMuted}
                />
                {isFocused && <View style={styles.activeIndicator} />}
            </Pressable>
        );
    };

    const leftTabs = routes.slice(0, midPoint).map((route, i) => renderTab(route, i));
    const rightTabs = routes.slice(midPoint).map((route, i) => renderTab(route, i + midPoint));

    return (
        <>
            {/* FAB — positioned absolutely but with EXPLICIT dimensions so it doesn't stretch */}
            <View
                pointerEvents="box-none"
                style={[styles.fabAnchor, { bottom: bottomPadding + hp(6) }]}
            >
                <Pressable
                    onPress={handleFabPress}
                    style={({ pressed }) => [
                        styles.fabTouchable,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.92 }] },
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={styles.fab}>
                        <Ionicons name="add" size={FAB_ICON_SIZE} color="#FFFFFF" />
                    </View>
                </Pressable>
            </View>

            {/* Tab Bar */}
            <View style={[styles.container, { paddingBottom: bottomPadding }]}>
                <View style={styles.tabBar}>
                    {leftTabs}
                    <View style={styles.fabSpacer} />
                    {rightTabs}
                </View>
            </View>

            <AddExpenseSheet
                visible={sheetVisible}
                onClose={handleSheetClose}
                onSaved={handleExpenseSaved}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: Colors.dark.tabBar,
        borderRadius: wp(28),
        marginHorizontal: wp(16),
        paddingVertical: hp(6),
        paddingHorizontal: wp(8),
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: Colors.dark.tabBarBorder,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: MIN_TOUCH_TARGET,
        minWidth: MIN_TOUCH_TARGET,
        paddingVertical: hp(8),
    },
    activeIndicator: {
        width: wp(4),
        height: wp(4),
        borderRadius: wp(2),
        backgroundColor: Colors.dark.accent,
        marginTop: hp(4),
    },
    fabSpacer: {
        width: FAB_SIZE + wp(8),
    },
    fabAnchor: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    fabTouchable: {
        width: FAB_SIZE,
        height: FAB_SIZE,
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        backgroundColor: Colors.dark.accent,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: Colors.dark.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
});
