// ─── Job Queue Service ────────────────────────────────────────────────────────
// In-memory job queue for managing long-running audit operations
// MVP implementation - jobs are lost on server restart

import { v4 as uuidv4 } from 'uuid'

export type JobStatus = 'queued' | 'running' | 'complete' | 'failed'

export interface Job {
    id: string
    status: JobStatus
    progress: number           // 0-100
    message: string            // Current activity description
    librariesTotal: number     // Total libraries to scan
    librariesScanned: number   // Libraries completed
    currentLibrary: string | null  // Currently scanning library
    result: any | null         // Manifest result when complete
    error: string | null       // Error message if failed
    createdAt: Date
    startedAt: Date | null
    completedAt: Date | null
}

export class JobQueue {
    private jobs = new Map<string, Job>()
    private readonly MAX_JOBS = 100  // Prevent memory leak
    private readonly JOB_TTL = 3600000  // 1 hour in milliseconds

    /**
     * Create a new job
     */
    createJob(): Job {
        const job: Job = {
            id: uuidv4(),
            status: 'queued',
            progress: 0,
            message: 'Initializing audit...',
            librariesTotal: 0,
            librariesScanned: 0,
            currentLibrary: null,
            result: null,
            error: null,
            createdAt: new Date(),
            startedAt: null,
            completedAt: null,
        }

        this.jobs.set(job.id, job)
        this.cleanup() // Remove old jobs if needed
        return job
    }

    /**
     * Get job by ID
     */
    getJob(id: string): Job | null {
        return this.jobs.get(id) || null
    }

    /**
     * Update job progress
     */
    updateJob(id: string, updates: Partial<Job>): Job | null {
        const job = this.jobs.get(id)
        if (!job) return null

        Object.assign(job, updates)
        this.jobs.set(id, job)
        return job
    }

    /**
     * Mark job as running
     */
    startJob(id: string, librariesTotal: number): Job | null {
        return this.updateJob(id, {
            status: 'running',
            startedAt: new Date(),
            librariesTotal,
            message: 'Discovering libraries...',
        })
    }

    /**
     * Update job progress (called during audit)
     */
    updateProgress(
        id: string,
        librariesScanned: number,
        currentLibrary: string | null,
        message: string
    ): Job | null {
        const job = this.jobs.get(id)
        if (!job) return null

        const progress = job.librariesTotal > 0
            ? Math.round((librariesScanned / job.librariesTotal) * 100)
            : 0

        return this.updateJob(id, {
            progress,
            librariesScanned,
            currentLibrary,
            message,
        })
    }

    /**
     * Mark job as complete with result
     */
    completeJob(id: string, result: any): Job | null {
        return this.updateJob(id, {
            status: 'complete',
            progress: 100,
            message: 'Audit complete',
            result,
            completedAt: new Date(),
            currentLibrary: null,
        })
    }

    /**
     * Mark job as failed with error
     */
    failJob(id: string, error: string): Job | null {
        return this.updateJob(id, {
            status: 'failed',
            message: 'Audit failed',
            error,
            completedAt: new Date(),
            currentLibrary: null,
        })
    }

    /**
     * Delete a job
     */
    deleteJob(id: string): boolean {
        return this.jobs.delete(id)
    }

    /**
     * Get all jobs (for admin/debugging)
     */
    getAllJobs(): Job[] {
        return Array.from(this.jobs.values())
    }

    /**
     * Cleanup old completed jobs to prevent memory leak
     */
    private cleanup(): void {
        const now = Date.now()
        const jobsToDelete: string[] = []

        // Find jobs older than TTL
        for (const [id, job] of this.jobs.entries()) {
            if (job.completedAt) {
                const age = now - job.completedAt.getTime()
                if (age > this.JOB_TTL) {
                    jobsToDelete.push(id)
                }
            }
        }

        // Delete old jobs
        jobsToDelete.forEach(id => this.jobs.delete(id))

        // If still too many jobs, delete oldest completed ones
        if (this.jobs.size > this.MAX_JOBS) {
            const completedJobs = Array.from(this.jobs.values())
                .filter(j => j.status === 'complete' || j.status === 'failed')
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

            const toDelete = completedJobs.slice(0, this.jobs.size - this.MAX_JOBS)
            toDelete.forEach(job => this.jobs.delete(job.id))
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const jobs = Array.from(this.jobs.values())
        return {
            total: jobs.length,
            queued: jobs.filter(j => j.status === 'queued').length,
            running: jobs.filter(j => j.status === 'running').length,
            complete: jobs.filter(j => j.status === 'complete').length,
            failed: jobs.filter(j => j.status === 'failed').length,
        }
    }
}

// Singleton instance
export const jobQueue = new JobQueue()