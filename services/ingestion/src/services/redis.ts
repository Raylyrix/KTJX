import { createClient, RedisClientType } from 'redis'
import { createLogger } from '../utils/logger'

export class RedisService {
  private client: RedisClientType
  private logger = createLogger('redis-service')

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    })

    this.client.on('error', (err) => {
      this.logger.error('Redis client error:', err)
    })

    this.client.on('connect', () => {
      this.logger.info('Connected to Redis')
    })

    this.client.on('disconnect', () => {
      this.logger.warn('Disconnected from Redis')
    })
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect()
      this.logger.info('Redis connection established')
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect()
      this.logger.info('Redis connection closed')
    } catch (error) {
      this.logger.error('Error disconnecting from Redis:', error)
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value)
      } else {
        await this.client.set(key, value)
      }
      return true
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error)
      return false
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<boolean> {
    return this.set(key, value, seconds)
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error)
      return false
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds)
      return result
    } catch (error) {
      this.logger.error(`Failed to set expiry for key ${key}:`, error)
      return false
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key)
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error)
      return -1
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern)
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern ${pattern}:`, error)
      return []
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      await this.client.flushDb()
      return true
    } catch (error) {
      this.logger.error('Failed to flush database:', error)
      return false
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch (error) {
      this.logger.error('Redis ping failed:', error)
      return false
    }
  }
}
