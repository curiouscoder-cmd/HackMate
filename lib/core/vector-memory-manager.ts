// Handle potential module resolution issues
let Pinecone: any;
let GoogleGenerativeAI: any;

try {
  ({ Pinecone } = require('@pinecone-database/pinecone'));
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch (error) {
  console.warn('Vector memory dependencies not available:', error);
  // Create mock classes to prevent compilation errors
  Pinecone = class MockPinecone {};
  GoogleGenerativeAI = class MockGoogleGenerativeAI {};
}

export interface VectorMemoryEntry {
  id: string;
  type: 'task' | 'decision' | 'code' | 'error' | 'context';
  content: string;
  metadata: {
    taskId?: string;
    agent?: string;
    timestamp: string;
    tags?: string[];
    [key: string]: any;
  };
  embedding?: number[];
}

export interface VectorSearchResult extends VectorMemoryEntry {
  score: number;
}

interface VectorMemoryState {
  pinecone: any | null;
  genAI: any | null;
  indexName: string;
  fallbackMemory: VectorMemoryEntry[];
  isInitialized: boolean;
  usePinecone: boolean;
}

// Global state instance
let memoryState: VectorMemoryState = {
  pinecone: null,
  genAI: null,
  indexName: process.env.PINECONE_INDEX_NAME || 'hackmate-memory',
  fallbackMemory: [],
  isInitialized: false,
  usePinecone: false,
};

console.log('🧠 Vector Memory Manager initializing...');

// Helper function to ensure index exists
const ensureIndexExists = async (): Promise<void> => {
  if (!memoryState.pinecone) return;

  try {
    const indexes = await memoryState.pinecone.listIndexes();
    const indexExists = indexes.indexes?.some((index: any) => index.name === memoryState.indexName);

    if (!indexExists) {
      console.log(`📝 Creating Pinecone index: ${memoryState.indexName}`);
      await memoryState.pinecone.createIndex({
        name: memoryState.indexName,
        dimension: 768, // Gemini embedding dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      // Wait for index to be ready
      console.log('⏳ Waiting for index to be ready...');
      await waitForIndexReady();
    }
  } catch (error) {
    console.error('Error ensuring index exists:', error);
    throw error;
  }
};

// Helper function to wait for index to be ready
const waitForIndexReady = async (): Promise<void> => {
  if (!memoryState.pinecone) return;

  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const indexStats = await memoryState.pinecone.index(memoryState.indexName).describeIndexStats();
      if (indexStats) {
        console.log('✅ Index is ready');
        return;
      }
    } catch (error) {
      // Index might not be ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Index did not become ready within expected time');
};

// Helper function to generate embeddings
const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!memoryState.genAI) {
    throw new Error('Gemini AI not initialized for embeddings');
  }

  try {
    const model = memoryState.genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

// Helper function for text similarity calculation
const calculateTextSimilarity = (text: string, query: string): number => {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Simple similarity based on common words
  const textWords = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  
  const commonWords = textWords.filter(word => queryWords.includes(word));
  return commonWords.length / Math.max(textWords.length, queryWords.length);
};

// Initialize the vector memory system
export const initializeVectorMemory = async (): Promise<void> => {
  try {
    // Try to initialize Pinecone
    if (process.env.PINECONE_API_KEY) {
      memoryState.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      // Initialize Gemini for embeddings
      if (process.env.GEMINI_API_KEY) {
        memoryState.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }

      // Test connection
      await ensureIndexExists();
      memoryState.usePinecone = true;
      console.log('✅ Vector Memory Manager initialized with Pinecone');
    } else {
      console.log('⚠️  Pinecone not configured, using fallback in-memory storage');
      memoryState.usePinecone = false;
    }

    memoryState.isInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone, falling back to in-memory:', error);
    memoryState.usePinecone = false;
    memoryState.isInitialized = true;
  }
};

// Store a memory entry
export const storeMemoryEntry = async (entry: Omit<VectorMemoryEntry, 'id' | 'embedding'>): Promise<string> => {
  const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const memoryEntry: VectorMemoryEntry = {
    id,
    ...entry,
    metadata: {
      ...entry.metadata,
      timestamp: new Date().toISOString(),
    }
  };

  if (memoryState.usePinecone && memoryState.pinecone && memoryState.genAI) {
    try {
      // Generate embedding
      const embedding = await generateEmbedding(entry.content);
      memoryEntry.embedding = embedding;

      // Store in Pinecone
      const index = memoryState.pinecone.index(memoryState.indexName);
      await index.upsert([{
        id,
        values: embedding,
        metadata: {
          type: entry.type,
          content: entry.content,
          ...entry.metadata,
        }
      }]);

      console.log(`📝 Stored memory entry in Pinecone: ${id}`);
    } catch (error) {
      console.error('Error storing in Pinecone, falling back to memory:', error);
      memoryState.fallbackMemory.push(memoryEntry);
    }
  } else {
    // Fallback to in-memory storage
    memoryState.fallbackMemory.push(memoryEntry);
    
    // Keep only recent entries to prevent memory bloat
    if (memoryState.fallbackMemory.length > 1000) {
      memoryState.fallbackMemory = memoryState.fallbackMemory.slice(-1000);
    }
  }

  return id;
};

// Retrieve memory entries
export const retrieveMemoryEntries = async (query: string, limit: number = 5): Promise<VectorSearchResult[]> => {
  if (memoryState.usePinecone && memoryState.pinecone && memoryState.genAI) {
    try {
      // Generate query embedding
      const queryEmbedding = await generateEmbedding(query);

      // Search in Pinecone
      const index = memoryState.pinecone.index(memoryState.indexName);
      const searchResults = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
      });

      return searchResults.matches?.map((match: any) => ({
        id: match.id,
        type: match.metadata?.type as VectorMemoryEntry['type'],
        content: match.metadata?.content as string,
        metadata: match.metadata as VectorMemoryEntry['metadata'],
        score: match.score || 0,
      })) || [];
    } catch (error) {
      console.error('Error searching Pinecone, falling back to text search:', error);
    }
  }

  // Fallback to simple text search
  const queryLower = query.toLowerCase();
  const matches = memoryState.fallbackMemory
    .filter(entry => 
      entry.content.toLowerCase().includes(queryLower) ||
      entry.metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))
    )
    .map(entry => ({
      ...entry,
      score: calculateTextSimilarity(entry.content, query)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matches;
};

// Update a memory entry
export const updateMemoryEntry = async (id: string, updates: Partial<VectorMemoryEntry>): Promise<boolean> => {
  if (memoryState.usePinecone && memoryState.pinecone) {
    try {
      // For Pinecone, we need to delete and re-insert
      const index = memoryState.pinecone.index(memoryState.indexName);
      
      // Get existing entry
      const existing = await index.fetch([id]);
      const existingEntry = existing.records?.[id];
      
      if (!existingEntry) return false;

      // Create updated entry
      const updatedContent = updates.content || existingEntry.metadata?.content as string;
      const updatedMetadata = {
        ...existingEntry.metadata,
        ...updates.metadata,
        timestamp: new Date().toISOString(),
      };

      // Generate new embedding if content changed
      let embedding = existingEntry.values;
      if (updates.content && memoryState.genAI) {
        embedding = await generateEmbedding(updatedContent);
      }

      // Upsert updated entry
      await index.upsert([{
        id,
        values: embedding,
        metadata: {
          type: updates.type || existingEntry.metadata?.type || 'context',
          content: updatedContent,
          ...updatedMetadata,
        }
      }]);

      return true;
    } catch (error) {
      console.error('Error updating in Pinecone:', error);
    }
  }

  // Fallback to in-memory update
  const index = memoryState.fallbackMemory.findIndex(entry => entry.id === id);
  if (index === -1) return false;

  memoryState.fallbackMemory[index] = {
    ...memoryState.fallbackMemory[index],
    ...updates,
    id, // Ensure ID doesn't change
    metadata: {
      ...memoryState.fallbackMemory[index].metadata,
      ...updates.metadata,
      timestamp: new Date().toISOString(),
    }
  };

  return true;
};

// Delete a memory entry
export const deleteMemoryEntry = async (id: string): Promise<boolean> => {
  if (memoryState.usePinecone && memoryState.pinecone) {
    try {
      const index = memoryState.pinecone.index(memoryState.indexName);
      await index.deleteOne(id);
      return true;
    } catch (error) {
      console.error('Error deleting from Pinecone:', error);
    }
  }

  // Fallback to in-memory delete
  const index = memoryState.fallbackMemory.findIndex(entry => entry.id === id);
  if (index === -1) return false;

  memoryState.fallbackMemory.splice(index, 1);
  return true;
};

// Get entries by type
export const getMemoryEntriesByType = async (type: VectorMemoryEntry['type'], limit: number = 10): Promise<VectorMemoryEntry[]> => {
  if (memoryState.usePinecone && memoryState.pinecone) {
    try {
      const index = memoryState.pinecone.index(memoryState.indexName);
      const results = await index.query({
        vector: new Array(768).fill(0), // Dummy vector for metadata filtering
        topK: limit,
        includeMetadata: true,
        filter: { type: { $eq: type } }
      });

      return results.matches?.map((match: any) => ({
        id: match.id,
        type: match.metadata?.type as VectorMemoryEntry['type'],
        content: match.metadata?.content as string,
        metadata: match.metadata as VectorMemoryEntry['metadata'],
      })) || [];
    } catch (error) {
      console.error('Error querying by type in Pinecone:', error);
    }
  }

  // Fallback to in-memory search
  return memoryState.fallbackMemory
    .filter(entry => entry.type === type)
    .sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime())
    .slice(0, limit);
};

// Clear all memory
export const clearMemory = async (): Promise<void> => {
  if (memoryState.usePinecone && memoryState.pinecone) {
    try {
      const index = memoryState.pinecone.index(memoryState.indexName);
      await index.deleteAll();
      console.log('🧹 Pinecone index cleared');
    } catch (error) {
      console.error('Error clearing Pinecone index:', error);
    }
  }

  memoryState.fallbackMemory = [];
  console.log('🧹 Memory cleared');
};

// Get memory statistics
export const getMemoryStats = async (): Promise<{
  totalEntries: number;
  entriesByType: Record<string, number>;
  usingPinecone: boolean;
  indexName?: string;
}> => {
  let totalEntries = 0;
  let entriesByType: Record<string, number> = {};

  if (memoryState.usePinecone && memoryState.pinecone) {
    try {
      const index = memoryState.pinecone.index(memoryState.indexName);
      const stats = await index.describeIndexStats();
      totalEntries = stats.totalRecordCount || 0;
      
      // Note: Pinecone doesn't provide breakdown by metadata fields in stats
      // This would require a separate query for each type
    } catch (error) {
      console.error('Error getting Pinecone stats:', error);
    }
  } else {
    totalEntries = memoryState.fallbackMemory.length;
    memoryState.fallbackMemory.forEach(entry => {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
    });
  }

  return {
    totalEntries,
    entriesByType,
    usingPinecone: memoryState.usePinecone,
    indexName: memoryState.usePinecone ? memoryState.indexName : undefined,
  };
};

// Helper functions for specific use cases
export const addTaskContext = async (taskId: string, context: string, metadata: any = {}): Promise<string> => {
  return storeMemoryEntry({
    type: 'task',
    content: context,
    metadata: {
      taskId,
      ...metadata,
      tags: ['task', taskId, ...(metadata.tags || [])],
    }
  });
};

export const addDecision = async (decision: string, reasoning: string, metadata: any = {}): Promise<string> => {
  return storeMemoryEntry({
    type: 'decision',
    content: `Decision: ${decision}\nReasoning: ${reasoning}`,
    metadata: {
      ...metadata,
      tags: ['decision', ...(metadata.tags || [])],
    }
  });
};

export const addCodeContext = async (code: string, description: string, metadata: any = {}): Promise<string> => {
  return storeMemoryEntry({
    type: 'code',
    content: `${description}\n\n\`\`\`\n${code}\n\`\`\``,
    metadata: {
      ...metadata,
      tags: ['code', ...(metadata.tags || [])],
    }
  });
};

export const addError = async (error: string, context: string, metadata: any = {}): Promise<string> => {
  return storeMemoryEntry({
    type: 'error',
    content: `Error: ${error}\nContext: ${context}`,
    metadata: {
      ...metadata,
      tags: ['error', ...(metadata.tags || [])],
    }
  });
};

export const getTaskContext = async (taskId: string): Promise<VectorSearchResult[]> => {
  return retrieveMemoryEntries(`task ${taskId}`, 10);
};

export const getRelevantContext = async (query: string, limit: number = 5): Promise<VectorSearchResult[]> => {
  return retrieveMemoryEntries(query, limit);
};

export const isMemoryReady = (): boolean => {
  return memoryState.isInitialized;
};

export const isPineconeEnabled = (): boolean => {
  return memoryState.usePinecone;
};
