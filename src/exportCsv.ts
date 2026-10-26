import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { transactionsToCsv } from './finance/csv';
import { monthKey } from './finance/recurring';
import type { Transaction } from './finance/transactions';

// Saves transactions as a CSV and hands it to the phone's share sheet (Save to Files,
// Google Drive, email…). Web cannot share local files, so the browser downloads it.
export async function exportTransactionsCsv(transactions: readonly Transaction[]): Promise<void> {
  // A byte-order mark makes Excel read Chinese/Malay notes as UTF-8.
  const content = `﻿${transactionsToCsv(transactions)}`;
  const fileName = `duitflow-${monthKey(new Date())}.csv`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: fileName,
  });
}
