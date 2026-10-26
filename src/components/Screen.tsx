import { useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  type ScrollViewInstance,
} from 'react-native';

import { spacing } from '@/theme';

// Scrollable screen body that stays above the keyboard. If the keyboard covers the
// focused field (forms put Note and Save last), the form scrolls to its end.
export function Screen({ children }: { children: ReactNode }) {
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const input = TextInput.State.currentlyFocusedInput();
      input?.measureInWindow((_x, y, _width, height) => {
        if (y + height > event.endCoordinates.screenY) {
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      });
    });
    return () => subscription.remove();
  }, []);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
});
