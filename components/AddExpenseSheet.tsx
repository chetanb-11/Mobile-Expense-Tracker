import { CATEGORIES, PAYMENT_METHODS } from '@/constants/categories';
import { Colors } from '@/constants/colors';
import { addExpense } from '@/utils/database';
import { fp, hp, wp } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface AddExpenseSheetProps {
    visible: boolean;
    onClose: () => void;
    onSaved: () => void;
    defaultPaymentMethod?: string;
    currencySymbol?: string;
}

export default function AddExpenseSheet({
    visible,
    onClose,
    onSaved,
    defaultPaymentMethod = 'cash',
    currencySymbol = '₹',
}: AddExpenseSheetProps) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('food');
    const [paymentMethod, setPaymentMethod] = useState<string>(defaultPaymentMethod);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const amountRef = useRef<TextInput>(null);

    useEffect(() => {
        if (visible) {
            setAmount('');
            setCategory('food');
            setPaymentMethod(defaultPaymentMethod);
            setNote('');
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 25,
                    stiffness: 200,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setTimeout(() => amountRef.current?.focus(), 100);
            });
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: Dimensions.get('window').height,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleSave = useCallback(async () => {
        const num = parseFloat(amount);
        if (!num || num <= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
            return;
        }
        setSaving(true);
        console.log('[Save] Starting save...', { amount: num, category, paymentMethod, note });
        try {
            const id = await addExpense({
                amount: num,
                category,
                payment_method: paymentMethod,
                note: note.trim(),
                date: new Date().toISOString(),
            });
            console.log('[Save] Expense saved successfully with id:', id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaved();
            onClose();
        } catch (e: any) {
            console.error('[Save] Failed to save expense:', e);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Save Failed',
                `Could not save expense: ${e?.message || String(e)}\n\nPlease try again.`
            );
        } finally {
            setSaving(false);
        }
    }, [amount, category, paymentMethod, note, onSaved, onClose]);

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <KeyboardAvoidingView
                style={styles.modalRoot}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View
                    style={[styles.backdrop, { opacity: backdropAnim }]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                <Animated.View
                    style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
                >
                    {/* Handle */}
                    <View style={styles.handleRow}>
                        <View style={styles.handle} />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Amount */}
                        <Text style={styles.label}>Amount</Text>
                        <View style={styles.amountRow}>
                            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                            <TextInput
                                ref={amountRef}
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={Colors.dark.textMuted}
                                selectionColor={Colors.dark.accent}
                            />
                        </View>

                        {/* Payment Method */}
                        <Text style={styles.label}>Payment Method</Text>
                        <View style={styles.pillRow}>
                            {PAYMENT_METHODS.map((pm) => (
                                <Pressable
                                    key={pm.id}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setPaymentMethod(pm.id);
                                    }}
                                    style={[
                                        styles.pill,
                                        paymentMethod === pm.id && styles.pillActive,
                                    ]}
                                    android_ripple={{ color: 'rgba(124,58,237,0.15)', borderless: false }}
                                >
                                    <Text
                                        style={[
                                            styles.pillText,
                                            paymentMethod === pm.id && styles.pillTextActive,
                                        ]}
                                    >
                                        {pm.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Category */}
                        <Text style={styles.label}>Category</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipScroll}
                        >
                            {CATEGORIES.map((cat) => (
                                <Pressable
                                    key={cat.id}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setCategory(cat.id);
                                    }}
                                    style={[
                                        styles.chip,
                                        category === cat.id && { backgroundColor: cat.color + '30', borderColor: cat.color },
                                    ]}
                                    android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: false }}
                                >
                                    <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                                    <Text
                                        style={[
                                            styles.chipText,
                                            category === cat.id && { color: cat.color },
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Note */}
                        <Text style={styles.label}>Note (optional)</Text>
                        <TextInput
                            style={styles.noteInput}
                            value={note}
                            onChangeText={setNote}
                            placeholder="What was this for?"
                            placeholderTextColor={Colors.dark.textMuted}
                            selectionColor={Colors.dark.accent}
                            maxLength={100}
                        />

                        {/* Save */}
                        <Pressable
                            onPress={handleSave}
                            disabled={saving || !amount}
                            style={[
                                styles.saveBtn,
                                (!amount || saving) && styles.saveBtnDisabled,
                            ]}
                            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
                        >
                            <Ionicons name="checkmark-circle" size={fp(22)} color="#FFF" />
                            <Text style={styles.saveBtnText}>
                                {saving ? 'Saving...' : 'Save Expense'}
                            </Text>
                        </Pressable>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        backgroundColor: Colors.dark.surface,
        borderTopLeftRadius: wp(24),
        borderTopRightRadius: wp(24),
        maxHeight: '85%',
        borderTopWidth: 1,
        borderColor: Colors.dark.border,
    },
    handleRow: {
        alignItems: 'center',
        paddingTop: hp(10),
        paddingBottom: hp(4),
    },
    handle: {
        width: wp(40),
        height: hp(4),
        borderRadius: 2,
        backgroundColor: Colors.dark.textMuted,
    },
    scrollContent: {
        paddingHorizontal: wp(20),
        paddingBottom: hp(40),
    },
    label: {
        fontSize: fp(13),
        fontWeight: '600',
        color: Colors.dark.textSecondary,
        marginTop: hp(16),
        marginBottom: hp(8),
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.background,
        borderRadius: wp(16),
        paddingHorizontal: wp(20),
        paddingVertical: hp(12),
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    currencySymbol: {
        fontSize: fp(32),
        fontWeight: '700',
        color: Colors.dark.accent,
        marginRight: wp(8),
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    amountInput: {
        flex: 1,
        fontSize: fp(36),
        fontWeight: '700',
        color: Colors.dark.text,
        paddingVertical: 0,
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(8),
    },
    pill: {
        paddingHorizontal: wp(16),
        paddingVertical: hp(10),
        borderRadius: wp(20),
        backgroundColor: Colors.dark.background,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        minHeight: 48,
        justifyContent: 'center',
    },
    pillActive: {
        backgroundColor: Colors.dark.accent + '25',
        borderColor: Colors.dark.accent,
    },
    pillText: {
        fontSize: fp(14),
        color: Colors.dark.textSecondary,
        fontWeight: '500',
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    pillTextActive: {
        color: Colors.dark.accent,
        fontWeight: '600',
    },
    chipScroll: {
        paddingRight: wp(20),
        gap: wp(8),
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp(14),
        paddingVertical: hp(10),
        borderRadius: wp(20),
        backgroundColor: Colors.dark.background,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        minHeight: 48,
    },
    chipEmoji: {
        fontSize: fp(18),
        marginRight: wp(6),
    },
    chipText: {
        fontSize: fp(13),
        color: Colors.dark.textSecondary,
        fontWeight: '500',
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
    noteInput: {
        backgroundColor: Colors.dark.background,
        borderRadius: wp(14),
        paddingHorizontal: wp(16),
        paddingVertical: hp(14),
        fontSize: fp(15),
        color: Colors.dark.text,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        minHeight: 48,
        ...Platform.select({ android: { fontFamily: 'sans-serif' } }),
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.dark.accent,
        borderRadius: wp(16),
        paddingVertical: hp(16),
        marginTop: hp(24),
        gap: wp(8),
        minHeight: 56,
        elevation: 4,
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: fp(17),
        fontWeight: '700',
        color: '#FFFFFF',
        ...Platform.select({ android: { fontFamily: 'sans-serif-medium' } }),
    },
});
