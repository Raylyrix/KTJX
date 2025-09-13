import { Queue, Worker, Job } from 'bullmq'
import { RedisService } from './redis'
import { createLogger } from '../utils/logger'

export interface QueueJobData {
  mailboxId: string
  type: 'initial' | 'incremental' | 'full'
  priority: 'low' | 'medium' | 'high'
  [key: string]: any
}

export class QueueService {
  private logger = createLogger('queue-service')
  private ingestionQueue: Queue<QueueJobData>
  private worker: Worker<QueueJobData>
  private isWorkerStarted = false

  constructor(private redisService: RedisService) {
    this.ingestionQueue = new Queue('ingestion', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    })
  }

  async addJob(
    jobType: string,
    data: QueueJobData,
    options: {
      priority?: number
      delay?: number
      attempts?: number
    } = {}
  ): Promise<Job<QueueJobData>> {
    try {
      const job = await this.ingestionQueue.add(jobType, data, {
        priority: this.getPriorityValue(data.priority),
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        ...options
      })

      this.logger.info('Job added to queue', {
        jobId: job.id,
        jobType,
        mailboxId: data.mailboxId,
        priority: data.priority
      })

      return job

    } catch (error) {
      this.logger.error('Failed to add job to queue', { error, jobType, data })
      throw error
    }
  }

  async startWorker(): Promise<void> {
    if (this.isWorkerStarted) {
      this.logger.warn('Worker is already started')
      return
    }

    this.worker = new Worker(
      'ingestion',
      async (job: Job<QueueJobData>) => {
        return await this.processJob(job)
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        },
        concurrency: 5,
        removeOnComplete: 100,
        removeOnFail: 50
      }
    )

    // Event handlers
    this.worker.on('completed', (job) => {
      this.logger.info('Job completed', {
        jobId: job.id,
        jobType: job.name,
        mailboxId: job.data.mailboxId,
        duration: Date.now() - job.timestamp
      })
    })

    this.worker.on('failed', (job, error) => {
      this.logger.error('Job failed', {
        jobId: job?.id,
        jobType: job?.name,
        mailboxId: job?.data.mailboxId,
        error: error.message,
        attempts: job?.attemptsMade
      })
    })

    this.worker.on('stalled', (jobId) => {
      this.logger.warn('Job stalled', { jobId })
    })

    this.worker.on('error', (error) => {
      this.logger.error('Worker error', { error: error.message })
    })

    this.isWorkerStarted = true
    this.logger.info('Queue worker started')
  }

  async stopWorker(): Promise<void> {
    if (!this.isWorkerStarted) {
      return
    }

    await this.worker.close()
    this.isWorkerStarted = false
    this.logger.info('Queue worker stopped')
  }

  private async processJob(job: Job<QueueJobData>): Promise<any> {
    const { jobType, mailboxId, type, priority } = job.data

    this.logger.info('Processing job', {
      jobId: job.id,
      jobType,
      mailboxId,
      type,
      priority
    })

    try {
      switch (jobType) {
        case 'backfill':
          return await this.processBackfillJob(job)
        case 'sync':
          return await this.processSyncJob(job)
        case 'refresh_token':
          return await this.processRefreshTokenJob(job)
        default:
          throw new Error(`Unknown job type: ${jobType}`)
      }
    } catch (error) {
      this.logger.error('Job processing failed', {
        jobId: job.id,
        jobType,
        mailboxId,
        error: error.message
      })
      throw error
    }
  }

  private async processBackfillJob(job: Job<QueueJobData>): Promise<any> {
    const { mailboxId, type } = job.data

    // This would call the ingestion service to perform backfill
    // For now, we'll simulate the process
    this.logger.info('Processing backfill job', { mailboxId, type })

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      mailboxId,
      type,
      status: 'completed',
      messagesProcessed: Math.floor(Math.random() * 1000),
      threadsProcessed: Math.floor(Math.random() * 100)
    }
  }

  private async processSyncJob(job: Job<QueueJobData>): Promise<any> {
    const { mailboxId, type } = job.data

    this.logger.info('Processing sync job', { mailboxId, type })

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500))

    return {
      mailboxId,
      type,
      status: 'completed',
      messagesProcessed: Math.floor(Math.random() * 100),
      threadsProcessed: Math.floor(Math.random() * 10)
    }
  }

  private async processRefreshTokenJob(job: Job<QueueJobData>): Promise<any> {
    const { mailboxId } = job.data

    this.logger.info('Processing refresh token job', { mailboxId })

    // Simulate token refresh
    await new Promise(resolve => setTimeout(resolve, 200))

    return {
      mailboxId,
      status: 'completed',
      tokenRefreshed: true
    }
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'high': return 1
      case 'medium': return 5
      case 'low': return 10
      default: return 5
    }
  }

  async getQueueStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.ingestionQueue.getWaiting(),
        this.ingestionQueue.getActive(),
        this.ingestionQueue.getCompleted(),
        this.ingestionQueue.getFailed(),
        this.ingestionQueue.getDelayed()
      ])

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      }
    } catch (error) {
      this.logger.error('Failed to get queue stats', { error })
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      }
    }
  }

  async pauseQueue(): Promise<void> {
    await this.ingestionQueue.pause()
    this.logger.info('Queue paused')
  }

  async resumeQueue(): Promise<void> {
    await this.ingestionQueue.resume()
    this.logger.info('Queue resumed')
  }

  async clearQueue(): Promise<void> {
    await this.ingestionQueue.obliterate({ force: true })
    this.logger.info('Queue cleared')
  }

  async getFailedJobs(): Promise<Job<QueueJobData>[]> {
    return await this.ingestionQueue.getFailed()
  }

  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.ingestionQueue.getJob(jobId)
    if (job) {
      await job.retry()
      this.logger.info('Failed job retried', { jobId })
    }
  }
}
