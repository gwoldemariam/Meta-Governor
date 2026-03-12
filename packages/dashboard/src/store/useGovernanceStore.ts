import { create } from 'zustand'
import type { TenantManifest, AuditedItem, ItemGap } from '@meta-governor/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkQueueItem {
    compositeId: string
    itemId: number
    fileName: string
    itemUrl: string
    riskScore: number
    gaps: ItemGap[]
    libraryName: string
    libraryUrl: string
}

export interface GovernanceSettings {
    loggingMode: 'local' | 'sharepoint'
    spLogListName: string
}

const DEFAULT_SETTINGS: GovernanceSettings = {
    loggingMode: 'local',
    spLogListName: 'GovernanceRemediationLog',
}

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error'

// ─── Store interface ──────────────────────────────────────────────────────────

interface GovernanceState {
    // Manifest
    manifest: TenantManifest | null
    loadStatus: LoadStatus
    loadError: string | null

    // UI state
    theme: 'light' | 'dark'
    selectedItemId: string | null
    activeLibrary: string | null
    queueFilter: 'all' | 'high' | 'medium' | 'low'
    searchQuery: string

    // Settings
    settings: GovernanceSettings

    // Actions
    loadManifest: (file: File) => void
    clearManifest: () => void
    toggleTheme: () => void
    setSelectedItem: (id: string | null) => void
    setActiveLibrary: (name: string | null) => void
    setQueueFilter: (f: 'all' | 'high' | 'medium' | 'low') => void
    setSearchQuery: (q: string) => void
    updateSettings: (patch: Partial<GovernanceSettings>) => void
    removeFromQueue: (compositeId: string) => void

    // Selectors
    getWorkQueue: () => WorkQueueItem[]
    getLibraryByName: (name: string) => TenantManifest['libraries'][number] | undefined
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readTheme(): 'light' | 'dark' {
    try {
        const saved = localStorage.getItem('mg-theme')
        if (saved === 'dark' || saved === 'light') return saved
    } catch { }
    return 'light'
}

function applyTheme(theme: 'light' | 'dark') {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark')
    } else {
        document.documentElement.classList.remove('dark')
    }
    try { localStorage.setItem('mg-theme', theme) } catch { }
}

function readSettings(): GovernanceSettings {
    try {
        const saved = localStorage.getItem('mg-settings')
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    } catch { }
    return DEFAULT_SETTINGS
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGovernanceStore = create<GovernanceState>((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────────
    manifest: null,
    loadStatus: 'idle',
    loadError: null,
    theme: readTheme(),
    selectedItemId: null,
    activeLibrary: null,
    queueFilter: 'all',
    searchQuery: '',
    settings: readSettings(),

    // ── Actions ────────────────────────────────────────────────────────────────

    loadManifest: (file: File) => {
        set({ loadStatus: 'loading', loadError: null })

        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string
                const data = JSON.parse(text)

                if (data.schemaVersion !== '2.0') {
                    set({
                        loadStatus: 'error',
                        loadError: `Expected schemaVersion "2.0" but got "${data.schemaVersion ?? 'unknown'}". Re-run the engine to generate a fresh manifest.`,
                        manifest: null,
                    })
                    return
                }

                set({ loadStatus: 'loaded', manifest: data, loadError: null })
            } catch {
                set({
                    loadStatus: 'error',
                    loadError: 'Could not parse the file. Make sure it is a valid JSON manifest.',
                    manifest: null,
                })
            }
        }

        reader.onerror = () => {
            set({
                loadStatus: 'error',
                loadError: 'Failed to read the file. Please try again.',
                manifest: null,
            })
        }

        reader.readAsText(file)
    },

    clearManifest: () => {
        set({
            manifest: null,
            loadStatus: 'idle',
            loadError: null,
            selectedItemId: null,
            activeLibrary: null,
            queueFilter: 'all',
            searchQuery: '',
        })
    },

    toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        applyTheme(next)
        set({ theme: next })
    },

    setSelectedItem: (id) => set({ selectedItemId: id }),

    setActiveLibrary: (name) => set({ activeLibrary: name }),

    setQueueFilter: (f) => set({ queueFilter: f }),

    setSearchQuery: (q) => set({ searchQuery: q }),

    updateSettings: (patch) => {
        set(state => {
            const next = { ...state.settings, ...patch }
            try { localStorage.setItem('mg-settings', JSON.stringify(next)) } catch { }
            return { settings: next }
        })
    },

    removeFromQueue: (compositeId: string) => {
        set(state => {
            if (!state.manifest) return {}

            // Parse compositeId back to libraryUrl + itemId
            const [libraryUrl, itemIdStr] = compositeId.split('::')
            const itemId = Number(itemIdStr)

            const updatedLibraries = state.manifest.libraries.map(lib => {
                if (lib.serverRelativeUrl !== libraryUrl) return lib

                const updatedItems: AuditedItem[] = lib.items.map(item =>
                    item.itemId === itemId
                        ? { ...item, status: 'Pass' as const, gaps: [], riskScore: 0 }
                        : item
                )

                const newPassCount = updatedItems.filter(i => i.status === 'Pass').length
                const newFailCount = updatedItems.filter(i => i.status === 'Fail').length

                return { ...lib, items: updatedItems, passCount: newPassCount, failCount: newFailCount }
            })

            const totalPass = updatedLibraries.reduce((sum, l) => sum + l.passCount, 0)
            const totalFail = updatedLibraries.reduce((sum, l) => sum + l.failCount, 0)
            const totalItems = state.manifest.summary.totalItems
            const newRate = totalItems > 0 ? Math.round((totalPass / totalItems) * 1000) / 10 : 0

            return {
                manifest: {
                    ...state.manifest,
                    libraries: updatedLibraries,
                    summary: {
                        ...state.manifest.summary,
                        passCount: totalPass,
                        failCount: totalFail,
                        complianceRate: newRate,
                    },
                },
                selectedItemId: state.selectedItemId === compositeId ? null : state.selectedItemId,
            }
        })
    },

    // ── Selectors ──────────────────────────────────────────────────────────────

    getWorkQueue: () => {
        const { manifest } = get()
        if (!manifest) return []

        const queue: WorkQueueItem[] = []

        for (const lib of manifest.libraries) {
            for (const item of lib.items) {
                if (item.status === 'Fail') {
                    queue.push({
                        compositeId: `${lib.serverRelativeUrl}::${item.itemId}`,
                        itemId: item.itemId,
                        fileName: item.fileName,
                        itemUrl: item.itemUrl,
                        riskScore: item.riskScore,
                        gaps: item.gaps,
                        libraryName: lib.libraryName,
                        libraryUrl: lib.serverRelativeUrl,
                    })
                }
            }
        }

        return queue
    },

    getLibraryByName: (name) => {
        return get().manifest?.libraries.find(l => l.libraryName === name)
    },
}))