import { create } from 'zustand'
import type { TenantManifest, AuditedItem, ItemGap } from '@meta-governor/shared'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001'

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
type ReauditStatus = 'idle' | 'running' | 'done' | 'error'

export interface LibraryProgress {
    libraryName: string
    status: 'pending' | 'scanning' | 'complete'
    newItemsFound?: number
}

export interface ReauditSummary {
    totalNewItems: number
    librariesScanned: number
    totalNewLibraries: number
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface GovernanceState {
    // Manifest
    manifest: TenantManifest | null
    loadStatus: LoadStatus
    loadError: string | null

    // Re-audit
    reauditStatus: ReauditStatus
    reauditError: string | null
    reauditedAt: string | null
    libraryProgress: LibraryProgress[]
    reauditSummary: ReauditSummary | null
    showReauditToast: boolean
    previousComplianceRate: number | null  // For trend tracking
    previousFailCount: number | null       // For failing items trend

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
    triggerReaudit: () => Promise<void>
    dismissReauditToast: () => void

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

    reauditStatus: 'idle',
    reauditError: null,
    reauditedAt: null,
    libraryProgress: [],
    reauditSummary: null,
    showReauditToast: false,
    previousComplianceRate: null,
    previousFailCount: null,

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

                // Auto-trigger re-audit silently after manifest loads
                setTimeout(() => { get().triggerReaudit() }, 300)

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
            reauditStatus: 'idle',
            reauditError: null,
            reauditedAt: null,
            libraryProgress: [],
            reauditSummary: null,
            showReauditToast: false,
            previousComplianceRate: null,
            previousFailCount: null,
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

                // Update schemaStatus based on new failCount
                let newSchemaStatus = lib.schemaStatus
                if (lib.schemaStatus !== 'no-schema' && lib.schemaStatus !== 'empty') {
                    newSchemaStatus = newFailCount > 0 ? 'violations' : 'governed'
                }

                return {
                    ...lib,
                    items: updatedItems,
                    itemCount: updatedItems.length,
                    passCount: newPassCount,
                    failCount: newFailCount,
                    schemaStatus: newSchemaStatus
                }
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

    triggerReaudit: async () => {
        const { manifest, reauditStatus } = get()
        if (!manifest) return
        if (reauditStatus === 'running') return     // already in flight

        const MIN_DISPLAY_TIME = 800 // ms
        const startTime = Date.now()

        // Initialize progress for all governed libraries
        const governedLibraries = manifest.libraries.filter(lib =>
            lib.schemaStatus === 'governed' || lib.schemaStatus === 'violations'
        )

        const initialProgress: LibraryProgress[] = governedLibraries.map(lib => ({
            libraryName: lib.libraryName,
            status: 'pending' as const,
        }))

        set({
            reauditStatus: 'running',
            reauditError: null,
            libraryProgress: initialProgress,
            showReauditToast: false,
        })

        // Simulate per-library scanning with staggered updates
        const simulateProgress = async () => {
            for (let i = 0; i < governedLibraries.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 150))

                set(state => ({
                    libraryProgress: state.libraryProgress.map((lib, idx) =>
                        idx === i ? { ...lib, status: 'scanning' as const } : lib
                    )
                }))
            }
        }

        // Start progress simulation
        simulateProgress()

        try {
            const res = await fetch(`${API_BASE}/api/reaudit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manifest }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }))
                throw new Error(err.error ?? `HTTP ${res.status}`)
            }

            const result = await res.json()

            // Build progress for ALL libraries in the result (includes new ones)
            let totalNewItems = 0
            let totalNewLibraries = 0

            const oldLibraryUrls = new Set(governedLibraries.map(lib => lib.serverRelativeUrl))

            const updatedProgress: LibraryProgress[] = result.libraries
                .filter((lib: any) => lib.schemaStatus === 'governed' || lib.schemaStatus === 'violations')
                .map((freshLib: any) => {
                    const oldLib = governedLibraries.find(lib => lib.serverRelativeUrl === freshLib.serverRelativeUrl)

                    // Check if this is a brand new library
                    const isNewLibrary = !oldLibraryUrls.has(freshLib.serverRelativeUrl)
                    if (isNewLibrary) {
                        totalNewLibraries++
                    }

                    // Calculate new items (only for existing libraries)
                    const oldItemCount = oldLib?.itemCount ?? 0
                    const newItemCount = freshLib.itemCount
                    const newItems = Math.max(0, newItemCount - oldItemCount)
                    totalNewItems += newItems

                    return {
                        libraryName: freshLib.libraryName,
                        status: 'complete' as const,
                        newItemsFound: newItems > 0 ? newItems : undefined,
                    }
                })

            // Enforce minimum display time
            const elapsed = Date.now() - startTime
            if (elapsed < MIN_DISPLAY_TIME) {
                await new Promise(resolve => setTimeout(resolve, MIN_DISPLAY_TIME - elapsed))
            }

            // Merge fresh library data back into manifest
            set(state => {
                if (!state.manifest) return {}

                // Save current metrics before updating (for trend tracking)
                const previousRate = state.manifest.summary?.complianceRate ?? null
                const previousFails = state.manifest.summary?.failCount ?? null

                // Use the complete library list from re-audit result
                // Re-audit now returns ALL libraries (old + new), so we don't need to merge
                return {
                    manifest: {
                        ...state.manifest,
                        libraries: result.libraries,  // Replace entirely with fresh data
                        summary: result.summary,      // Replace entirely with fresh summary
                    },
                    reauditStatus: 'done' as ReauditStatus,
                    reauditError: null,
                    reauditedAt: result.reauditedAt,
                    libraryProgress: updatedProgress,
                    reauditSummary: {
                        totalNewItems,
                        librariesScanned: updatedProgress.length,  // Actual number scanned
                        totalNewLibraries,
                    },
                    showReauditToast: true,
                    previousComplianceRate: previousRate,
                    previousFailCount: previousFails,
                }
            })

            // Auto-dismiss toast after 4 seconds
            setTimeout(() => {
                set({ showReauditToast: false })
            }, 4000)

        } catch (err: any) {
            console.warn('[reaudit] failed:', err.message)
            set({
                reauditStatus: 'error',
                reauditError: err.message ?? 'Re-audit failed',
                libraryProgress: [],
            })
        }
    },

    dismissReauditToast: () => {
        set({ showReauditToast: false })
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