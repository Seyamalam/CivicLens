import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

interface LanguageToggleProps {
  variant?: 'header' | 'settings' | 'floating';
  size?: 'sm' | 'md' | 'lg';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ 
  variant = 'header',
  size = 'md' 
}) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const isEnglish = currentLanguage === 'en';

  const toggleLanguage = () => {
    const newLanguage = isEnglish ? 'bn' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'header':
        return {
          container: 'flex-row items-center bg-primary-100 dark:bg-primary-800 rounded-full px-3 py-1',
          text: 'text-xs font-medium text-primary-700 dark:text-primary-200',
        };
      case 'settings':
        return {
          container: 'flex-row items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4',
          text: 'text-sm font-medium text-gray-700 dark:text-gray-200',
        };
      case 'floating':
        return {
          container: 'flex-row items-center bg-white dark:bg-gray-900 rounded-full px-4 py-3 shadow-lg border border-gray-100 dark:border-gray-700',
          text: 'text-sm font-medium text-gray-700 dark:text-gray-200',
        };
      default:
        return {
          container: 'flex-row items-center bg-primary-100 dark:bg-primary-800 rounded-full px-3 py-1',
          text: 'text-xs font-medium text-primary-700 dark:text-primary-200',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { iconSize: 14, spacing: 'space-x-1' };
      case 'lg':
        return { iconSize: 20, spacing: 'space-x-3' };
      default:
        return { iconSize: 16, spacing: 'space-x-2' };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  if (variant === 'settings') {
    return (
      <TouchableOpacity 
        onPress={toggleLanguage}
        className={variantStyles.container}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons 
            name="language" 
            size={sizeStyles.iconSize} 
            className="text-gray-500 dark:text-gray-400 mr-3" 
          />
          <View>
            <Text className={variantStyles.text}>
              Language / ভাষা
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isEnglish ? 'English' : 'বাংলা'}
            </Text>
          </View>
        </View>
        
        <MotiView
          animate={{
            rotate: isEnglish ? '0deg' : '180deg',
          }}
          transition={{
            type: 'timing',
            duration: 300,
          }}
        >
          <View className="bg-primary-500 rounded-full p-2">
            <Text className="text-white font-bold text-xs">
              {isEnglish ? 'EN' : 'বং'}
            </Text>
          </View>
        </MotiView>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={toggleLanguage}
      className={variantStyles.container}
      activeOpacity={0.8}
    >
      <MotiView
        animate={{
          scale: isEnglish ? 1.1 : 1,
        }}
        transition={{
          type: 'timing',
          duration: 200,
        }}
        className={`flex-row items-center ${sizeStyles.spacing}`}
      >
        <Ionicons 
          name="language" 
          size={sizeStyles.iconSize} 
          className="text-primary-600 dark:text-primary-300" 
        />
        <Text className={variantStyles.text}>
          {isEnglish ? 'EN' : 'বং'}
        </Text>
        <MotiView
          animate={{
            rotate: isEnglish ? '0deg' : '180deg',
          }}
          transition={{
            type: 'timing',
            duration: 300,
          }}
        >
          <Ionicons 
            name="chevron-down" 
            size={12} 
            className="text-primary-600 dark:text-primary-300" 
          />
        </MotiView>
      </MotiView>
    </TouchableOpacity>
  );
};

// Hook for accessing current language state
export const useLanguage = () => {
  const { i18n } = useTranslation();
  
  return {
    currentLanguage: i18n.language,
    isEnglish: i18n.language === 'en',
    isBangla: i18n.language === 'bn',
    toggleLanguage: () => {
      const newLanguage = i18n.language === 'en' ? 'bn' : 'en';
      i18n.changeLanguage(newLanguage);
    },
    setLanguage: (language: 'en' | 'bn') => {
      i18n.changeLanguage(language);
    }
  };
};