import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';

export type LLMProvider = 'gemini' | 'openai' | 'ollama' | 'openrouter';

export interface ModelConfig {
  provider?: LLMProvider;
  modelName?: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
}

/**
 * Multi-provider model factory for LangGraph.
 * Allows effortless switching between Gemini, OpenAI, Claude, OpenRouter, or local Ollama/Hermes.
 */
export function createChatModel(config: ModelConfig = {}): BaseChatModel {
  const provider = (config.provider || process.env.LLM_PROVIDER || 'gemini') as LLMProvider;
  const temperature = config.temperature ?? 0.2;

  switch (provider) {
    case 'openai': {
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
      const model = config.modelName || process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature,
      });
    }

    case 'ollama':
    case 'openrouter': {
      const baseURL =
        config.baseURL ||
        (provider === 'ollama'
          ? process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
          : 'https://openrouter.ai/api/v1');
      const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || (provider === 'ollama' ? 'ollama' : undefined);
      const model = config.modelName || (provider === 'ollama' ? 'hermes3' : 'meta-llama/llama-3.3-70b-instruct');

      return new ChatOpenAI({
        openAIApiKey: apiKey,
        configuration: {
          baseURL,
        },
        modelName: model,
        temperature,
      });
    }

    case 'gemini':
    default: {
      const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
      // Use verified modern Gemini models: gemini-3.8-flash is the primary active model
      const model = config.modelName || process.env.GEMINI_MODEL_NAME || 'gemini-3.8-flash';
      return new ChatGoogleGenerativeAI({
        apiKey,
        model,
        temperature,
      });
    }
  }
}
