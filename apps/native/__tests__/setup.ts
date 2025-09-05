import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        convexUrl: 'https://test-convex-url.convex.cloud'
      }
    }
  }
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn()
  }),
  useLocalSearchParams: () => ({}),
  Stack: {
    Screen: 'MockedStackScreen'
  },
  Tabs: {
    Screen: 'MockedTabScreen'
  }
}));

jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    readTransaction: jest.fn(),
    close: jest.fn()
  }))
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn()
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn()
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn()
    }
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn()
  }
}));

// Mock NativeWind
jest.mock('nativewind', () => ({
  styled: (component: any) => component
}));

// Mock Moti
jest.mock('moti', () => ({
  MotiView: 'MotiView',
  AnimatePresence: 'AnimatePresence'
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Icon'
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Global test helpers
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch for API calls
global.fetch = jest.fn();