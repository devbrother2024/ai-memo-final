// lib/ai/utils.ts
// AI 관련 유틸리티 함수들
// 토큰 계산, 재시도 로직, 사용량 로깅 등 공통 기능 제공
// 관련 파일: lib/ai/gemini-client.ts, lib/ai/types.ts, lib/ai/errors.ts

import { APIUsageLog, TokenUsage } from './types';
import { isNonRetryableError } from './errors';
import { getEnvironmentInfo } from './config';

/**
 * 텍스트의 토큰 수 추정
 * 대략적인 계산: 1 토큰 ≈ 4 문자 (한국어/영어 혼합 기준)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // 한국어와 영어가 혼합된 텍스트에 대한 보정
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const englishChars = text.length - koreanChars;
  
  // 한국어는 토큰 비율이 높음 (1 토큰 ≈ 2.5 문자)
  // 영어는 표준 비율 (1 토큰 ≈ 4 문자)
  const estimatedTokens = Math.ceil((koreanChars / 2.5) + (englishChars / 4));
  
  return Math.max(1, estimatedTokens);
}

/**
 * 토큰 제한 검증
 */
export function validateTokenLimit(
  inputTokens: number,
  maxTokens: number = 8192,
  reservedTokens: number = 2000
): boolean {
  return inputTokens <= maxTokens - reservedTokens;
}

/**
 * 토큰 사용량 검증 및 조정
 */
export function validateAndAdjustTokens(
  text: string,
  maxTokens: number = 8192
): { isValid: boolean; adjustedText?: string; estimatedTokens: number } {
  const estimatedTokens = estimateTokens(text);
  const reservedTokens = 2000;
  const maxInputTokens = maxTokens - reservedTokens;
  
  if (estimatedTokens <= maxInputTokens) {
    return { isValid: true, estimatedTokens };
  }
  
  // 텍스트 자르기 (안전한 토큰 수로 조정)
  const targetLength = Math.floor((text.length * maxInputTokens) / estimatedTokens);
  const adjustedText = text.substring(0, targetLength) + '...';
  
  return {
    isValid: false,
    adjustedText,
    estimatedTokens: estimateTokens(adjustedText)
  };
}

/**
 * 재시도 로직 (지수 백오프)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseBackoffMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // 재시도 불가능한 에러는 즉시 throw
      if (isNonRetryableError(error)) {
        throw error;
      }

      // 마지막 시도면 재시도하지 않음
      if (attempt >= maxRetries) {
        break;
      }

      // 지수 백오프로 대기
      const backoffMs = baseBackoffMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.3 * backoffMs; // 30% 지터 추가
      await sleep(backoffMs + jitter);

      console.warn(`[Retry ${attempt}/${maxRetries}] Operation failed, retrying...`, {
        error: lastError.message,
        nextAttemptIn: backoffMs + jitter
      });
    }
  }

  throw lastError!;
}

/**
 * 지연 함수
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * API 사용량 로깅
 */
export function logAPIUsage(log: APIUsageLog): void {
  const env = getEnvironmentInfo();
  
  // 개발 환경에서는 콘솔 출력
  if (env.debugEnabled) {
    console.log('[Gemini API Usage]', {
      timestamp: log.timestamp.toISOString(),
      model: log.model,
      tokens: {
        input: log.inputTokens,
        output: log.outputTokens,
        total: log.inputTokens + log.outputTokens
      },
      latency: `${log.latencyMs}ms`,
      success: log.success,
      error: log.error || null
    });
  }

  // 프로덕션에서는 실제 로깅 시스템으로 전송
  // TODO: 모니터링 시스템 연동 (예: DataDog, CloudWatch 등)
  if (env.isProduction) {
    // 실제 로깅 시스템 호출
    // sendToLoggingSystem(log);
  }
}

/**
 * 사용량 통계 계산
 */
export function calculateUsageStats(logs: APIUsageLog[]): {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  totalTokens: number;
  averageTokensPerRequest: number;
} {
  if (logs.length === 0) {
    return {
      totalRequests: 0,
      successRate: 0,
      averageLatency: 0,
      totalTokens: 0,
      averageTokensPerRequest: 0
    };
  }

  const successfulRequests = logs.filter(log => log.success);
  const totalTokens = logs.reduce((sum, log) => sum + log.inputTokens + log.outputTokens, 0);
  const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);

  return {
    totalRequests: logs.length,
    successRate: (successfulRequests.length / logs.length) * 100,
    averageLatency: totalLatency / logs.length,
    totalTokens,
    averageTokensPerRequest: totalTokens / logs.length
  };
}

/**
 * 텍스트 정리 (API 호출 전 전처리)
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\r\n/g, '\n') // Windows 줄바꿈 정규화
    .replace(/\t/g, '  ') // 탭을 공백으로 변환
    .replace(/\s+\n/g, '\n') // 줄 끝 공백 제거
    .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 정리
    .substring(0, 100000); // 최대 길이 제한
}

/**
 * 응답 시간 측정 헬퍼
 */
export function createTimer() {
  const start = Date.now();
  
  return {
    elapsed(): number {
      return Date.now() - start;
    },
    stop(): number {
      const elapsed = Date.now() - start;
      return elapsed;
    }
  };
}

/**
 * 비용 추정 (토큰 기반)
 */
export function estimateCost(tokens: TokenUsage, model: string = 'gemini-2.0-flash-001'): number {
  // Gemini 2.0 Flash 기준 가격 (2024년 기준, 실제 가격은 Google AI 문서 참조)
  const pricing = {
    'gemini-2.0-flash-001': {
      input: 0.00001875, // per 1K tokens
      output: 0.0000075   // per 1K tokens
    },
    'gemini-1.5-pro': {
      input: 0.000125,
      output: 0.000375
    }
  } as const;

  const modelPricing = pricing[model as keyof typeof pricing] || pricing['gemini-2.0-flash-001'];
  
  const inputCost = (tokens.input / 1000) * modelPricing.input;
  const outputCost = (tokens.output / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
}
