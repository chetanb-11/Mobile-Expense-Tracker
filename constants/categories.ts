export interface Category {
    id: string;
    label: string;
    emoji: string;
    color: string;
}

export const CATEGORIES: Category[] = [
    { id: 'food', label: 'Food', emoji: '🍔', color: '#F97316' },
    { id: 'transport', label: 'Transport', emoji: '🚗', color: '#3B82F6' },
    { id: 'shopping', label: 'Shopping', emoji: '🛍', color: '#EC4899' },
    { id: 'bills', label: 'Bills', emoji: '💡', color: '#EAB308' },
    { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#8B5CF6' },
    { id: 'groceries', label: 'Groceries', emoji: '🛒', color: '#10B981' },
    { id: 'health', label: 'Health', emoji: '💊', color: '#EF4444' },
    { id: 'travel', label: 'Travel', emoji: '✈', color: '#06B6D4' },
    { id: 'other', label: 'Other', emoji: '📦', color: '#6B7280' },
];

export const PAYMENT_METHODS = [
    { id: 'credit_card', label: 'Credit Card' },
    { id: 'upi', label: 'UPI' },
    { id: 'cash', label: 'Cash' },
    { id: 'other', label: 'Other' },
] as const;

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

export const getCategoryById = (id: string): Category =>
    CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

export const CURRENCIES = [
    { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'GBP', symbol: '£', label: 'British Pound' },
] as const;
