import { createContext, useContext, type ReactNode } from 'react';

import useGameData, { type UseGameDataReturn } from '../hooks/useGameData';

const GameDataContext = createContext<UseGameDataReturn | null>(null);

export function GameDataProvider({ children }: { children: ReactNode }) {
  const gameData = useGameData();
  return (
    <GameDataContext.Provider value={gameData}>
      {children}
    </GameDataContext.Provider>
  );
}

export function useGameDataContext(): UseGameDataReturn {
  const ctx = useContext(GameDataContext);
  if (!ctx) throw new Error('useGameDataContext must be used within GameDataProvider');
  return ctx;
}
