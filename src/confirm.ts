import { Alert, Platform } from 'react-native';

type Labels = { confirm: string; cancel: string };

// Asks before a destructive action. Alert.alert does nothing on web, so fall back to window.confirm.
export function confirmDestructive(
  title: string,
  message: string,
  labels: Labels,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.confirm, style: 'destructive', onPress: onConfirm },
  ]);
}
