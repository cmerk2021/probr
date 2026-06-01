import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  tool: string;
  toolPath: string; // route to re-open the tool
  input: string;
  status: 'success' | 'error';
  errorMessage?: string;
  durationMs?: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  add: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
  remove: (id: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) =>
        set((s) => ({
          entries: [
            { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
            ...s.entries,
          ].slice(0, 500),
        })),
      clear: () => set({ entries: [] }),
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'probr-history-v1' }
  )
);
