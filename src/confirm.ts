import { Alert, Platform } from 'react-native';

// Asks before a destructive action. Alert.alert does nothing on web, so fall back to window.confirm.
export function confirmDestructive(title: string, message: string, onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
