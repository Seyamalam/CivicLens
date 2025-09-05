import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LanguageToggle } from '@/components/language-toggle';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0891b2', // Primary teal color
        tabBarInactiveTintColor: '#64748b', // Gray color
        headerShown: true,
        headerRight: () => <LanguageToggle variant="header" size="sm" />,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: '#0891b2',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="procurement"
        options={{
          title: '🏛 Procurement',
          headerTitle: 'ProcureLens',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: '💵 Services',
          headerTitle: 'FeeCheck',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rti"
        options={{
          title: '📜 RTI',
          headerTitle: 'RTI Copilot',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="permits"
        options={{
          title: '📋 Permits',
          headerTitle: 'PermitPath',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: '📊 Budgets',
          headerTitle: 'WardWallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '👤 Profile',
          headerTitle: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size || 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}