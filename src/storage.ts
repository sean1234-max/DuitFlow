import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

// useState that is saved on the device. Nothing is written until the stored value
// has been read, so an early render can never overwrite saved data with the fallback.
export function usePersistentState<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(fallback);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw === null) return;
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) setValue(parsed);
        else console.warn(`Ignoring invalid saved data for ${key}`);
      })
      .catch((error: unknown) => console.warn(`Could not load ${key}`, error))
      .finally(() => setIsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per key
  }, [key]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch((error: unknown) =>
      console.warn(`Could not save ${key}`, error),
    );
  }, [key, value, isLoaded]);

  return [value, setValue, isLoaded];
}
