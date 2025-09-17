// lib/ai/types.ts
// AI 관련 타입 정의
// Gemini API 요청/응답 타입과 에러 타입을 정의하여 타입 안전성을 보장
// 관련 파일: lib/ai/gemini-client.ts, lib/ai/errors.ts, lib/ai/config.ts

/**
 * Gemini API 요청 옵션
 */
export interface GeminiRequestOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

/**
 * Gemini API 응답 데이터
 */
export interface GeminiResponse {
  text: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
  safetyRatings?: SafetyRating[];
}

/**
 * 안전성 등급
 */
export interface SafetyRating {
  category: string;
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * AI 서비스 공통 인터페이스
 */
export interface AIService {
  generateText(options: GeminiRequestOptions): Promise<GeminiResponse>;
  healthCheck(): Promise<boolean>;
  getConfig(): AIConfig;
}

/**
 * AI 설정 인터페이스
 */
export interface AIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  timeout: number;
  debug: boolean;
  rateLimitPerMinute: number;
}

/**
 * API 사용량 로그
 */
export interface APIUsageLog {
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * 토큰 사용량 정보
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * AI 처리 결과
 */
export interface AIProcessResult<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: TokenUsage;
  latencyMs: number;
}
