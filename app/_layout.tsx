import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { C } from '../theme';

// react-native-screens still uses core SafeAreaView internally;
// nothing actionable on our side until they migrate.
LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
