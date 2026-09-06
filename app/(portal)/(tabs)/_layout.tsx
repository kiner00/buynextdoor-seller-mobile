import { Tabs } from 'expo-router';
import { MoreHorizontal } from 'lucide-react-native';
import { TAB_ICONS } from '../../../src/navigation/sections';
import { colors } from '../../../src/theme/tokens';

/**
 * Four sections earn a permanent tab — the ones a seller opens daily — plus
 * More, which is the full sidebar. Anything beyond five tabs stops being
 * navigation and starts being a menu you have to read.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.neutral[900],
        headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.neutral[200] },
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: colors.neutral[50] },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <TAB_ICONS.dashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <TAB_ICONS.orders color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ color, size }) => <TAB_ICONS.catalogue color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => <TAB_ICONS.wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
