import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

/**
 * Initialize native plugins (StatusBar, SplashScreen) on Android/iOS.
 * Safe to call on web — no-ops when not native.
 */
export async function initNativePlugins() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#041E42' });
  } catch (e) {
    console.warn('StatusBar init skipped:', e);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen hide skipped:', e);
  }
}
