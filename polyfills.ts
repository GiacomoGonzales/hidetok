import { Platform } from 'react-native';

// Polyfill para window en React Native (necesario para Firebase Auth)
if (Platform.OS !== 'web') {
  console.log('🔧 Applying window polyfills for React Native...');

  // @ts-ignore
  if (typeof global.window === 'undefined') {
    // @ts-ignore
    global.window = global;
  }

  // @ts-ignore
  if (!global.window.addEventListener) {
    // @ts-ignore
    global.window.addEventListener = () => {
      console.log('📌 window.addEventListener polyfill called');
    };
  }

  // @ts-ignore
  if (!global.window.removeEventListener) {
    // @ts-ignore
    global.window.removeEventListener = () => {
      console.log('📌 window.removeEventListener polyfill called');
    };
  }

  // @ts-ignore
  if (!global.window.dispatchEvent) {
    // @ts-ignore
    global.window.dispatchEvent = () => {
      console.log('📌 window.dispatchEvent polyfill called');
      return true;
    };
  }

  console.log('✅ Window polyfills applied successfully');
}
