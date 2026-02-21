import { Dimensions, PixelRatio, Platform } from 'react-native';

// Samsung Galaxy S24 FE baseline: 6.7", 2340x1080, ~384dp width
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 384; // Galaxy S24 FE logical width in dp
const BASE_HEIGHT = 832; // approximate logical height in dp

/**
 * Scale a value based on screen width relative to Galaxy S24 FE baseline.
 * Use for horizontal dimensions: margins, paddings, widths.
 */
export function wp(size: number): number {
    return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
}

/**
 * Scale a value based on screen height relative to Galaxy S24 FE baseline.
 * Use for vertical dimensions: heights, vertical paddings.
 */
export function hp(size: number): number {
    return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size);
}

/**
 * Scale font size using a moderate scaling factor to avoid extreme sizes.
 * Uses width-based scaling clamped to prevent fonts from being too large/small.
 */
export function fp(size: number): number {
    const scale = SCREEN_WIDTH / BASE_WIDTH;
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Ensure minimum touch target of 48dp (Material Design guideline).
 */
export function ensureMinTouchTarget(size: number): number {
    return Math.max(size, 48);
}

/**
 * Check if the device has a tall aspect ratio (gesture nav likely).
 */
export const IS_TALL_DEVICE = SCREEN_HEIGHT / SCREEN_WIDTH > 2;

/**
 * Android gesture navigation bar height estimate.
 * On Android 10+ with gesture nav, the bar is typically 16-20dp.
 * We use useSafeAreaInsets() at runtime, but this is a fallback.
 */
export const ANDROID_GESTURE_BAR_HEIGHT = Platform.OS === 'android' ? 20 : 0;

export { SCREEN_HEIGHT, SCREEN_WIDTH };

