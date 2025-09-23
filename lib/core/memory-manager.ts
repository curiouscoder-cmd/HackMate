import { 
  VectorMemoryEntry, 
  VectorSearchResult,
  initializeVectorMemory,
  storeMemoryEntry,
  retrieveMemoryEntries,
  updateMemoryEntry,
  deleteMemoryEntry,
  getMemoryEntriesByType,
  clearMemory,
  getMemoryStats,
  addTaskContext as vectorAddTaskContext,
  addDecision as vectorAddDecision,
  addCodeContext as vectorAddCodeContext,
  addError as vectorAddError,
  getTaskContext as vectorGetTaskContext
} from './vector-memory-manager';

export interface MemoryEntry {
  id: string;
  type: 'task' | 'decision' | 'code' | 'error' | 'context';
  content: string;
  metadata: any;
  timestamp: string;
  embedding?: number[];
}

export class MemoryManager {
  private inMemoryStore: MemoryEntry[] = [];
  private maxEntries = 1000; // Limit memory usage

  constructor() {
    console.log('📝 Memory Manager initialized with vector capabilities');
  }

  async initialize(): Promise<void> {
    await initializeVectorMemory();
    console.log('✅ Memory Manager ready');
  }

  async store(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<string> {
    // Delegate to vector memory manager
    return await storeMemoryEntry({
      type: entry.type,
      content: entry.content,
      metadata: entry.metadata
    });
  }

  async retrieve(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    // Use vector memory manager for semantic search
    const results = await retrieveMemoryEntries(query, limit);
    
    // Convert to MemoryEntry format for backward compatibility
    return results.map((result: VectorSearchResult) => ({
      id: result.id,
      type: result.type,
      content: result.content,
      metadata: result.metadata,
      timestamp: result.metadata.timestamp,
    }));
  }

  async update(id: string, updates: Partial<MemoryEntry>): Promise<boolean> {
    return await updateMemoryEntry(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return await deleteMemoryEntry(id);
  }

  async getByType(type: MemoryEntry['type'], limit: number = 10): Promise<MemoryEntry[]> {
    const results = await getMemoryEntriesByType(type, limit);
    
    return results.map((result: VectorMemoryEntry) => ({
      id: result.id,
      type: result.type,
      content: result.content,
      metadata: result.metadata,
      timestamp: result.metadata.timestamp,
    }));
  }

  async getRecent(limit: number = 10): Promise<MemoryEntry[]> {
    // Get recent entries by querying with empty string
    const results = await retrieveMemoryEntries('', limit);
    
    return results.map((result: VectorSearchResult) => ({
      id: result.id,
      type: result.type,
      content: result.content,
      metadata: result.metadata,
      timestamp: result.metadata.timestamp,
    }));
  }

  async clear(): Promise<void> {
    await clearMemory();
  }

  async getStats(): Promise<{
    totalEntries: number;
    entriesByType: Record<string, number>;
    usingPinecone?: boolean;
    indexName?: string;
  }> {
    return await getMemoryStats();
  }

  // Helper method to add context about a task
  async addTaskContext(taskId: string, context: string, metadata: any = {}): Promise<string> {
    return await vectorAddTaskContext(taskId, context, metadata);
  }

  // Helper method to add decision context
  async addDecision(decision: string, reasoning: string, metadata: any = {}): Promise<string> {
    return await vectorAddDecision(decision, reasoning, metadata);
  }

  // Helper method to add code context
  async addCodeContext(code: string, description: string, metadata: any = {}): Promise<string> {
    return await vectorAddCodeContext(code, description, metadata);
  }

  // Helper method to add error context
  async addError(error: string, context: string, metadata: any = {}): Promise<string> {
    return await vectorAddError(error, context, metadata);
  }

  // Get context for a specific task
  async getTaskContext(taskId: string): Promise<MemoryEntry[]> {
    const results = await vectorGetTaskContext(taskId);
    
    return results.map((result: VectorSearchResult) => ({
      id: result.id,
      type: result.type,
      content: result.content,
      metadata: result.metadata,
      timestamp: result.metadata.timestamp,
    }));
  }

  // Get relevant context for a query (missing method)
  async getRelevantContext(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    const results = await retrieveMemoryEntries(query, limit);
    
    return results.map((result: VectorSearchResult) => ({
      id: result.id,
      type: result.type,
      content: result.content,
      metadata: result.metadata,
      timestamp: result.metadata.timestamp,
    }));
  }
}
