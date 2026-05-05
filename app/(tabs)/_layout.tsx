import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#D4874E',
      tabBarInactiveTintColor: '#A89B8C',
      tabBarStyle: { backgroundColor: '#FEFAF4', borderTopColor: '#EDE3D8' },
      headerShown: false,
    }}>
      <Tabs.Screen name="club" options={{ title: 'My Club' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
