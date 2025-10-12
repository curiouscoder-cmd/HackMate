import { Task } from '../agents/planner-agent';

/**
 * Task storage adapter for serverless environments
 * Uses Vercel KV or falls back to in-memory storage
 */

// In-memory fallback storage
const inMemoryStorage = new Map<string, Task>();

export class TaskStorage {
  private useKV: boolean = false;
  private kvStore: any = null;

  constructor() {
    // Check if Vercel KV is available
    this.useKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
  }

  async initialize(): Promise<void> {
    if (this.useKV) {
      try {
        // Dynamically import Vercel KV
        const { kv } = await import('@vercel/kv');
        this.kvStore = kv;
        console.log('✅ Using Vercel KV for task storage');
      } catch (error) {
        console.warn('⚠️ Vercel KV not available, using in-memory storage');
        this.useKV = false;
      }
    } else {
      console.log('📦 Using in-memory task storage');
    }
  }

  async set(taskId: string, task: Task): Promise<void> {
    if (this.useKV && this.kvStore) {
      await this.kvStore.set(`task:${taskId}`, JSON.stringify(task));
    } else {
      inMemoryStorage.set(taskId, task);
    }
  }

  async get(taskId: string): Promise<Task | null> {
    if (this.useKV && this.kvStore) {
      const data = await this.kvStore.get(`task:${taskId}`);
      return data ? JSON.parse(data as string) : null;
    } else {
      return inMemoryStorage.get(taskId) || null;
    }
  }

  async getAll(): Promise<Task[]> {
    if (this.useKV && this.kvStore) {
      const keys = await this.kvStore.keys('task:*');
      const tasks: Task[] = [];
      
      for (const key of keys) {
        const data = await this.kvStore.get(key);
        if (data) {
          tasks.push(JSON.parse(data as string));
        }
      }
      
      return tasks;
    } else {
      return Array.from(inMemoryStorage.values());
    }
  }

  async delete(taskId: string): Promise<void> {
    if (this.useKV && this.kvStore) {
      await this.kvStore.del(`task:${taskId}`);
    } else {
      inMemoryStorage.delete(taskId);
    }
  }

  async clear(): Promise<void> {
    if (this.useKV && this.kvStore) {
      const keys = await this.kvStore.keys('task:*');
      for (const key of keys) {
        await this.kvStore.del(key);
      }
    } else {
      inMemoryStorage.clear();
    }
  }

  async has(taskId: string): Promise<boolean> {
    if (this.useKV && this.kvStore) {
      const data = await this.kvStore.get(`task:${taskId}`);
      return data !== null;
    } else {
      return inMemoryStorage.has(taskId);
    }
  }
}
