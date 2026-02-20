import { createContext, useContext, type ReactNode } from 'react';

import useSheetData, { type UseSheetDataReturn } from '../hooks/useSheetData';

const SheetDataContext = createContext<UseSheetDataReturn | null>(null);

export function SheetDataProvider({ children }: { children: ReactNode }) {
  const sheetData = useSheetData();
  return (
    <SheetDataContext.Provider value={sheetData}>
      {children}
    </SheetDataContext.Provider>
  );
}

export function useSheetDataContext(): UseSheetDataReturn {
  const ctx = useContext(SheetDataContext);
  if (!ctx) throw new Error('useSheetDataContext must be used within SheetDataProvider');
  return ctx;
}
