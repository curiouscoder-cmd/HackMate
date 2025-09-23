/**
 * Latest AI Model Configuration (2024-2025)
 * Centralized configuration for all AI models used in the system
 */

export interface ModelConfig {
  name: string;
  provider: 'google' | 'openai' | 'anthropic';
  capabilities: readonly string[];
  contextWindow: number;
  costPerMToken: number;
  description: string;
}

// Latest Google Gemini Models (2024-2025)
export const GEMINI_MODELS = {
  // Current available models
  GEMINI_2_5_PRO: {
    name: 'gemini-2.5-pro',
    provider: 'google' as const,
    capabilities: ['text', 'images', 'video', 'audio', 'pdf', 'function_calling'],
    contextWindow: 2097152, // 2M tokens
    costPerMToken: 3.5,
    description: 'Most capable Gemini model with large context window'
  },
  
  GEMINI_2_5_FLASH: {
    name: 'gemini-2.5-flash',
    provider: 'google' as const,
    capabilities: ['text', 'images', 'video', 'audio', 'function_calling'],
    contextWindow: 1048576, // 1M tokens
    costPerMToken: 0.075, // Best price-performance
    description: 'Fast and efficient model optimized for speed and cost'
  },
  
  GEMINI_2_5: {
    name: 'gemini-pro',
    provider: 'google' as const,
    capabilities: ['text', 'function_calling'],
    contextWindow: 32768,
    costPerMToken: 0.5,
    description: 'Standard Gemini model for text generation'
  },
  
  // Embedding model
  GEMINI_EMBEDDING: {
    name: 'text-embedding-004',
    provider: 'google' as const,
    capabilities: ['text_embedding', 'multilingual'],
    contextWindow: 2048,
    costPerMToken: 0.15,
    description: 'Current working embedding model with multilingual support'
  }
} as const;

// Latest OpenAI Models (2024-2025)
export const OPENAI_MODELS = {
  GPT_4_1: {
    name: 'gpt-4.1',
    provider: 'openai' as const,
    capabilities: ['text', 'function_calling', 'structured_outputs'],
    contextWindow: 1000000, // 1M tokens
    costPerMToken: 30.0, // Estimated
    description: 'Latest GPT model with 1M token context and improved capabilities'
  },
  
  GPT_4O: {
    name: 'gpt-4o',
    provider: 'openai' as const,
    capabilities: ['text', 'images', 'audio', 'function_calling'],
    contextWindow: 128000,
    costPerMToken: 15.0,
    description: 'Multimodal model with vision and audio capabilities'
  },
  
  GPT_4_TURBO: {
    name: 'gpt-4-turbo',
    provider: 'openai' as const,
    capabilities: ['text', 'images', 'function_calling'],
    contextWindow: 128000,
    costPerMToken: 10.0,
    description: 'High-performance model for complex reasoning tasks'
  }
} as const;

// Latest Anthropic Claude Models (2024-2025)
export const CLAUDE_MODELS = {
  CLAUDE_3_5_SONNET: {
    name: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic' as const,
    capabilities: ['text', 'images', 'exceptional_reasoning'],
    contextWindow: 200000,
    costPerMToken: 15.0,
    description: 'Latest Claude 3.5 Sonnet with exceptional reasoning capabilities'
  },
  
  CLAUDE_3_OPUS: {
    name: 'claude-3-opus-20240229',
    provider: 'anthropic' as const,
    capabilities: ['text', 'images', 'superior_reasoning'],
    contextWindow: 200000,
    costPerMToken: 75.0,
    description: 'Most capable Claude model with superior reasoning'
  },
  
  CLAUDE_3_HAIKU: {
    name: 'claude-3-haiku-20240307',
    provider: 'anthropic' as const,
    capabilities: ['text', 'images', 'fast_reasoning'],
    contextWindow: 200000,
    costPerMToken: 1.25,
    description: 'Fast and efficient Claude model for quick tasks'
  }
} as const;

// Model selection strategy based on task type
export const MODEL_SELECTION_STRATEGY = {
  // For planning and analysis tasks
  PLANNING: {
    primary: GEMINI_MODELS.GEMINI_2_5_FLASH,
    reasoning: 'Fast, cost-effective model for planning tasks'
  },
  
  // For complex code generation
  CODING: {
    primary: GEMINI_MODELS.GEMINI_2_5_PRO,
    fallback: CLAUDE_MODELS.CLAUDE_3_5_SONNET,
    reasoning: 'Superior reasoning for complex code generation'
  },
  
  // For debugging and analysis
  DEBUGGING: {
    primary: CLAUDE_MODELS.CLAUDE_3_5_SONNET,
    fallback: GEMINI_MODELS.GEMINI_2_5_FLASH,
    reasoning: 'Exceptional reasoning for bug analysis'
  },
  
  // For embeddings and memory
  EMBEDDING: {
    primary: GEMINI_MODELS.GEMINI_EMBEDDING,
    fallback: null,
    reasoning: 'Latest embedding model with multilingual support'
  }
} as const;

// Get optimal model for task type
export const getOptimalModel = (taskType: keyof typeof MODEL_SELECTION_STRATEGY) => {
  return MODEL_SELECTION_STRATEGY[taskType];
};

// Get all available models
export const getAllModels = () => {
  return {
    ...GEMINI_MODELS,
    ...OPENAI_MODELS,
    ...CLAUDE_MODELS
  };
};

// Model capability checker
export const hasCapability = (modelName: string, capability: string): boolean => {
  const allModels = getAllModels();
  const model = Object.values(allModels).find(m => m.name === modelName);
  return model ? model.capabilities.some(cap => cap === capability) : false;
};

// Cost calculator
export const calculateCost = (modelName: string, inputTokens: number, outputTokens: number = 0): number => {
  const allModels = getAllModels();
  const model = Object.values(allModels).find(m => m.name === modelName);
  if (!model) return 0;
  
  const totalTokens = inputTokens + outputTokens;
  return (totalTokens / 1000000) * model.costPerMToken;
};
