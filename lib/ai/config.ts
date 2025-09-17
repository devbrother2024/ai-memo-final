// lib/ai/config.ts
// AI 서비스 설정 관리
// 환경변수를 통해 Gemini API 설정을 안전하게 관리하고 환경별 설정 분리
// 관련 파일: lib/ai/gemini-client.ts, lib/ai/types.ts, .env.local

import { AIConfig } from './types';

/**
 * 기본 Gemini 설정값
 */
const DEFAULT_CONFIG = {
  model: 'gemini-2.0-flash-001',
  maxTokens: 8192,
  timeout: 10000,
  debug: false,
  rateLimitPerMinute: 60,
  temperature: 0.7,
  topP: 0.8
} as const;

/**
 * Gemini 설정 가져오기
 */
export function getGeminiConfig(): AIConfig {
  const config: AIConfig = {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || DEFAULT_CONFIG.model,
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || String(DEFAULT_CONFIG.maxTokens)),
    timeout: parseInt(process.env.GEMINI_TIMEOUT_MS || String(DEFAULT_CONFIG.timeout)),
    debug: process.env.GEMINI_DEBUG === 'true' || process.env.NODE_ENV === 'development',
    rateLimitPerMinute: parseInt(process.env.GEMINI_RATE_LIMIT || String(DEFAULT_CONFIG.rateLimitPerMinute))
  };

  // 필수 설정 검증
  validateConfig(config);

  return config;
}

/**
 * 설정 유효성 검증
 */
function validateConfig(config: AIConfig): void {
  const errors: string[] = [];

  if (!config.apiKey) {
    errors.push('GEMINI_API_KEY is required');
  }

  if (config.maxTokens <= 0 || config.maxTokens > 50000) {
    errors.push('GEMINI_MAX_TOKENS must be between 1 and 50000');
  }

  if (config.timeout <= 0 || config.timeout > 60000) {
    errors.push('GEMINI_TIMEOUT_MS must be between 1 and 60000');
  }

  if (config.rateLimitPerMinute <= 0 || config.rateLimitPerMinute > 1000) {
    errors.push('GEMINI_RATE_LIMIT must be between 1 and 1000');
  }

  if (errors.length > 0) {
    throw new Error(`Gemini configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * 환경별 설정 확인
 */
export function getEnvironmentInfo() {
  return {
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    debugEnabled: process.env.GEMINI_DEBUG === 'true' || process.env.NODE_ENV === 'development'
  };
}

/**
 * 설정 정보를 안전하게 로깅 (API 키 제외)
 */
export function logConfigInfo(config: AIConfig): void {
  const env = getEnvironmentInfo();
  
  if (!env.debugEnabled) return;

  const safeConfig = {
    model: config.model,
    maxTokens: config.maxTokens,
    timeout: config.timeout,
    rateLimitPerMinute: config.rateLimitPerMinute,
    apiKeyLength: config.apiKey?.length || 0,
    environment: env.environment
  };

  console.log('[Gemini Config]', safeConfig);
}

/**
 * 요청별 동적 설정 생성
 */
export function createRequestConfig(overrides: Partial<AIConfig> = {}): Partial<AIConfig> {
  const baseConfig = getGeminiConfig();
  
  return {
    ...baseConfig,
    ...overrides
  };
}

/**
 * 모델별 최적 설정 가져오기
 */
export function getModelOptimizedConfig(model?: string): Partial<AIConfig> {
  const selectedModel = model || DEFAULT_CONFIG.model;
  
  // 모델별 최적화된 설정
  const modelConfigs = {
    'gemini-2.0-flash-001': {
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.8
    },
    'gemini-1.5-pro': {
      maxTokens: 32768,
      temperature: 0.5,
      topP: 0.9
    }
  } as const;

  return modelConfigs[selectedModel as keyof typeof modelConfigs] || modelConfigs['gemini-2.0-flash-001'];
}
