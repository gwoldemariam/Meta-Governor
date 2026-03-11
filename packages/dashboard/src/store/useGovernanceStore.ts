import { create } from 'zustand';
import type { TenantManifest, LibraryReport, AuditedItem } from '../types';

export interface WorkQueueItem extends AuditedItem {
    libraryName: string;
    libraryUrl: string;
}

// ── Load state ────────────────────────────────────────────────────────────────
type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

// ── The full store shape ──────────────────────────────────────────────────────
interface GovernanceStore {

    // ── Manifest data ─────────────────────────────────────────────────────────
    manifest: TenantManifest | null;
    loadStatus: LoadStatus;
    loadError: string | null;

    // ── UI state ──────────────────────────────────────────────────────────────
    theme: 'light' | 'dark';
    selectedItemId: number | null;        // item open in Fix Panel
    activeLibrary: string | null;        // library selected in Explorer

    // ── Remediation queue filters ─────────────────────────────────────────────
    queueFilter: 'all' | 'high' | 'medium' | 'low';
    searchQuery: string;

    // ── Actions — manifest ────────────────────────────────────────────────────
    loadManifest: (file: File) => Promise<void>;
    clearManifest: () => void;

    // ── Actions — UI ──────────────────────────────────────────────────────────
    toggleTheme: () => void;
    setSelectedItem: (itemId: number | null) => void;
    setActiveLibrary: (libraryName: string | null) => void;
    setQueueFilter: (filter: 'all' | 'high' | 'medium' | 'low') => void;
    setSearchQuery: (query: string) => void;

    // ── Derived selectors ─────────────────────────────────────────────────────
    getWorkQueue: () => WorkQueueItem[];
    getLibraryByName: (name: string) => LibraryReport | undefined;
}

// ── Store implementation ──────────────────────────────────────────────────────
export const useGovernanceStore = create<GovernanceStore>((set, get) => ({

    // ── Initial state ─────────────────────────────────────────────────────────
    manifest: null,
    loadStatus: 'idle',
    loadError: null,
    theme: (localStorage.getItem('mg-theme') as 'light' | 'dark') ?? 'light',
    selectedItemId: null,
    activeLibrary: null,
    queueFilter: 'all',
    searchQuery: '',

    // ── Load manifest from a dropped/picked JSON file ─────────────────────────
    loadManifest: async (file: File) => {
        set({ loadStatus: 'loading', loadError: null });

        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as TenantManifest;

            // Validate it's a v2.0 manifest — reject old shape
            if (parsed.schemaVersion !== '2.0') {
                throw new Error(
                    `Unsupported manifest version: "${parsed.schemaVersion}". ` +
                    `Please run the engine again to generate a v2.0 manifest.`
                );
            }

            if (!parsed.libraries || !Array.isArray(parsed.libraries)) {
                throw new Error('Invalid manifest: missing libraries array.');
            }

            set({ manifest: parsed, loadStatus: 'loaded' });

        } catch (err: any) {
            set({
                loadStatus: 'error',
                loadError: err.message ?? 'Failed to parse manifest file.'
            });
        }
    },

    // ── Clear loaded manifest and reset to idle ───────────────────────────────
    clearManifest: () => set({
        manifest: null,
        loadStatus: 'idle',
        loadError: null,
        selectedItemId: null,
        activeLibrary: null,
        queueFilter: 'all',
        searchQuery: ''
    }),

    // ── Toggle light / dark theme ─────────────────────────────────────────────
    toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('mg-theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
        set({ theme: next });
    },

    // ── UI setters ────────────────────────────────────────────────────────────
    setSelectedItem: (itemId) => set({ selectedItemId: itemId }),
    setActiveLibrary: (name) => set({ activeLibrary: name }),
    setQueueFilter: (filter) => set({ queueFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    // ── Flatten all failed items across all libraries into a work queue ────────
    // This is what the Remediation Queue table reads from
    getWorkQueue: (): WorkQueueItem[] => {
        const manifest = get().manifest;
        if (!manifest) return [];

        return manifest.libraries.flatMap(lib =>
            lib.items
                .filter(item => item.status === 'Fail')
                .map(item => ({
                    ...item,
                    libraryName: lib.libraryName,
                    libraryUrl: lib.serverRelativeUrl
                }))
        );
    },

    // ── Get a single library by name ──────────────────────────────────────────
    getLibraryByName: (name: string) => {
        return get().manifest?.libraries.find(l => l.libraryName === name);
    }
}));

// ── Apply saved theme on app init ─────────────────────────────────────────────
// Runs once when the store module is first imported
const savedTheme = localStorage.getItem('mg-theme') as 'light' | 'dark' | null;
if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
}