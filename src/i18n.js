// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from './locales/en/translation.json';
import translationHE from './locales/he/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  he: {
    translation: translationHE
  }
};

const systemLanguage = () => {
  if (window.user_local === "en") {
    return "en";
  } else if (window.user_local === "he_IL") {
    return "he";
  }
  return "en";
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: systemLanguage(),
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
