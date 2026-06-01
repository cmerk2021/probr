import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  /** Optional Alloy API key for higher rate limits. */
  apiKey: string;
  setApiKey: (v: string) => void;

  /** Auto-display raw JSON beneath every tool result. */
  showRawJson: boolean;
  toggleRawJson: () => void;

  /** Sidebar collapsed state. */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  /** When false, tool runs are not added to the history store. */
  historyEnabled: boolean;
  setHistoryEnabled: (v: boolean) => void;

  /** When false, tool pages don't auto-run on initial mount even if the page requests it. */
  autoRunOnMount: boolean;
  setAutoRunOnMount: (v: boolean) => void;

  /** Default placeholder/seed for domain inputs across the app. */
  defaultDomain: string;
  setDefaultDomain: (v: string) => void;

  /** Default placeholder/seed for IP inputs. */
  defaultIp: string;
  setDefaultIp: (v: string) => void;

  /** Reset every setting to its default. */
  resetAll: () => void;
}

const defaults = {
  apiKey: '',
  showRawJson: false,
  sidebarCollapsed: false,
  historyEnabled: true,
  autoRunOnMount: true,
  defaultDomain: 'cloudflare.com',
  defaultIp: '8.8.8.8',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setApiKey: (v) => set({ apiKey: v.trim() }),
      toggleRawJson: () => set((s) => ({ showRawJson: !s.showRawJson })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setHistoryEnabled: (v) => set({ historyEnabled: v }),
      setAutoRunOnMount: (v) => set({ autoRunOnMount: v }),
      setDefaultDomain: (v) => set({ defaultDomain: v.trim() || defaults.defaultDomain }),
      setDefaultIp: (v) => set({ defaultIp: v.trim() || defaults.defaultIp }),
      resetAll: () => set({ ...defaults }),
    }),
    { name: 'probr-settings-v1' }
  )
);
