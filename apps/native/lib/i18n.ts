import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import bnTranslations from "../locales/bn.json" with { type: "json" };
// Import translations
import enTranslations from "../locales/en.json" with { type: "json" };

const resources = {
  en: {
    translation: enTranslations,
  },
  bn: {
    translation: bnTranslations,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: Localization.locale?.split("-")[0] || "en", // Use device locale
  fallbackLng: "en",
  debug: __DEV__,

  interpolation: {
    escapeValue: false, // React Native already does escaping
  },

  react: {
    useSuspense: false,
  },
});

export default i18n;
