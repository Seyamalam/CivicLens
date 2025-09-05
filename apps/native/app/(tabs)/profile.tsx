import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LanguageToggle } from '@/components/language-toggle';
import { MotiView } from 'moti';

export default function ProfileScreen() {
  const { t } = useTranslation();

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement logout logic
            console.log('Logout pressed');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'account',
      icon: 'person-outline',
      title: t('profile.accountSettings'),
      subtitle: t('profile.accountSettingsDesc'),
      onPress: () => console.log('Account settings'),
    },
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: t('profile.notifications'),
      subtitle: t('profile.notificationsDesc'),
      onPress: () => console.log('Notifications'),
    },
    {
      id: 'privacy',
      icon: 'shield-outline',
      title: t('profile.privacy'),
      subtitle: t('profile.privacyDesc'),
      onPress: () => console.log('Privacy'),
    },
    {
      id: 'about',
      icon: 'information-circle-outline',
      title: t('profile.about'),
      subtitle: t('profile.aboutDesc'),
      onPress: () => console.log('About'),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* User Info Section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        className="bg-white dark:bg-gray-800 p-6 mb-4"
      >
        <View className="items-center">
          <View className="w-20 h-20 bg-primary-500 rounded-full items-center justify-center mb-4">
            <Ionicons name="person" size={32} color="white" />
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {t('profile.anonymousUser')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('profile.anonymousUserDesc')}
          </Text>
          
          <TouchableOpacity 
            className="mt-4 bg-primary-500 px-6 py-2 rounded-full"
            onPress={() => console.log('Sign in pressed')}
          >
            <Text className="text-white font-medium">
              {t('profile.signIn')}
            </Text>
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* Language Setting */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 100 }}
        className="bg-white dark:bg-gray-800 mx-4 rounded-xl mb-4"
      >
        <LanguageToggle variant="settings" />
      </MotiView>

      {/* Menu Items */}
      <View className="bg-white dark:bg-gray-800 mx-4 rounded-xl mb-4">
        {menuItems.map((item, index) => (
          <MotiView
            key={item.id}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 200 + (index * 100) }}
          >
            <TouchableOpacity
              onPress={item.onPress}
              className={`flex-row items-center p-4 ${
                index < menuItems.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
              }`}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center mr-3">
                <Ionicons 
                  name={item.icon as any} 
                  size={20} 
                  color="#0891b2" 
                />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  {item.title}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={16} 
                color="#9ca3af" 
              />
            </TouchableOpacity>
          </MotiView>
        ))}
      </View>

      {/* App Information */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 800 }}
        className="bg-white dark:bg-gray-800 mx-4 rounded-xl mb-4 p-4"
      >
        <Text className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          {t('profile.appName')} v1.0.0
        </Text>
        <Text className="text-center text-xs text-gray-400 dark:text-gray-500">
          {t('profile.madeWith')} ❤️ {t('profile.forTransparency')}
        </Text>
      </MotiView>

      {/* Logout Button */}
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 600, delay: 900 }}
        className="mx-4 mb-8"
      >
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 rounded-xl p-4 items-center"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text className="text-white font-medium ml-2">
              {t('profile.logout')}
            </Text>
          </View>
        </TouchableOpacity>
      </MotiView>
    </ScrollView>
  );
}