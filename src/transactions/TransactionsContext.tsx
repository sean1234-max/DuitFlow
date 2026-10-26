import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Transaction } from './model';

type NewTransaction = Omit<Transaction, 'id' | 'occurredAt'>;

interface TransactionsContextValue {
  transactions: readonly Transaction[];
  addTransaction: (input: NewTransaction) => void;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

// ponytail: in-memory only, data resets on reload; swap for Supabase once the project is set up.
export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<readonly Transaction[]>([]);

  const addTransaction = (input: NewTransaction) => {
    const transaction: Transaction = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      occurredAt: new Date().toISOString(),
    };
    setTransactions((current) => [transaction, ...current]);
  };

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsContextValue {
  const value = useContext(TransactionsContext);
  if (!value) throw new Error('useTransactions must be used inside TransactionsProvider');
  return value;
}
