import 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';

// Polyfill para window en React Native (necesario para Firebase Auth)
if (Platform.OS !== 'web') {
  // @ts-ignore
  if (typeof global.window === 'undefined') {
    // @ts-ignore
    global.window = global;
  }

  // @ts-ignore
  if (!global.window.addEventListener) {
    // @ts-ignore
    global.window.addEventListener = () => {};
  }

  // @ts-ignore
  if (!global.window.removeEventListener) {
    // @ts-ignore
    global.window.removeEventListener = () => {};
  }
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
