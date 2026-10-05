import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { COLORS } from '@/constants';
import { useSkinStyles } from '@/hooks/useSkinStyles';

type TabIconProps = {
  glyph: string;
  focused: boolean;
};

function TabIcon({ glyph, focused }: TabIconProps) {
  const styles = useSkinStyles(createStyles);
  return (
    <Text style={[styles.tabIcon, focused ? styles.tabIconActive : styles.tabIconInactive]}>
      {glyph}
    </Text>
  );
}

export default function TabsLayout() {
  const styles = useSkinStyles(createStyles);
  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: '今日',
          tabBarAccessibilityLabel: '今日',
          tabBarIcon: ({ focused }) => <TabIcon glyph="◷" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: '计划',
          tabBarAccessibilityLabel: '计划日历',
          tabBarIcon: ({ focused }) => <TabIcon glyph="▦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="all"
        options={{
          title: '全部',
          tabBarAccessibilityLabel: '全部提醒',
          tabBarIcon: ({ focused }) => <TabIcon glyph="☷" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarAccessibilityLabel: '设置',
          tabBarIcon: ({ focused }) => <TabIcon glyph="⚙" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function createStyles() {
  return StyleSheet.create({
  tabBar: {
    minHeight: 64,
    paddingTop: 7,
    paddingBottom: 7,
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBarItem: {
    paddingVertical: 1,
  },
  tabIcon: {
    fontSize: 21,
    lineHeight: 23,
  },
  tabIconActive: {
    color: COLORS.primary,
  },
  tabIconInactive: {
    color: COLORS.textMuted,
  },
  });
}

