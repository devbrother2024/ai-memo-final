// lib/ai/test.ts
// Gemini API 기본 기능 테스트
// 설치 및 설정이 올바른지 확인하기 위한 테스트 함수들
// 관련 파일: lib/ai/gemini-client.ts, lib/ai/types.ts, lib/ai/config.ts

import { getGeminiClient, checkGeminiHealth, generateText } from './gemini-client';
import { getGeminiConfig } from './config';
import { estimateTokens, validateTokenLimit } from './utils';

/**
 * 기본 설정 테스트
 */
export async function testGeminiSetup(): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}> {
  try {
    // 1. 설정 검증
    const config = getGeminiConfig();
    console.log('[Test] Config validation passed:', {
      model: config.model,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      hasApiKey: !!config.apiKey
    });

    // 2. 클라이언트 초기화 테스트
    getGeminiClient();
    console.log('[Test] Client initialization passed');

    // 3. 헬스체크 테스트
    const isHealthy = await checkGeminiHealth();
    if (!isHealthy) {
      return {
        success: false,
        message: 'Health check failed - API connection issue',
        details: { healthCheck: false }
      };
    }
    console.log('[Test] Health check passed');

    return {
      success: true,
      message: 'Gemini setup completed successfully',
      details: {
        config: {
          model: config.model,
          maxTokens: config.maxTokens,
          timeout: config.timeout
        },
        healthCheck: true
      }
    };

  } catch (error) {
    console.error('[Test] Setup failed:', error);
    return {
      success: false,
      message: `Setup failed: ${error instanceof Error ? error.message : String(error)}`,
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * 기본 텍스트 생성 테스트
 */
export async function testBasicTextGeneration(): Promise<{
  success: boolean;
  message: string;
  response?: string;
  metrics?: Record<string, unknown>;
}> {
  try {
    const startTime = Date.now();
    
    // 간단한 텍스트 생성 테스트
    const response = await generateText(
      '안녕하세요! 간단한 인사말로 답해주세요.',
      100
    );

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response || response.length === 0) {
      return {
        success: false,
        message: 'Text generation failed - empty response'
      };
    }

    console.log('[Test] Text generation result:', {
      prompt: '안녕하세요! 간단한 인사말로 답해주세요.',
      response: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
      latency: `${latency}ms`,
      responseLength: response.length
    });

    return {
      success: true,
      message: 'Text generation test passed',
      response,
      metrics: {
        latency,
        responseLength: response.length,
        estimatedTokens: estimateTokens(response)
      }
    };

  } catch (error) {
    console.error('[Test] Text generation failed:', error);
    return {
      success: false,
      message: `Text generation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 토큰 계산 테스트
 */
export function testTokenCalculation(): {
  success: boolean;
  message: string;
  results?: Array<Record<string, unknown>>;
} {
  try {
    const testTexts = [
      '안녕하세요!',
      'Hello, world!',
      '이것은 긴 텍스트입니다. '.repeat(100),
      '한국어와 English가 섞인 mixed text입니다.'
    ];

    const results = testTexts.map(text => ({
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      length: text.length,
      estimatedTokens: estimateTokens(text),
      isValid: validateTokenLimit(estimateTokens(text))
    }));

    console.log('[Test] Token calculation results:', results);

    return {
      success: true,
      message: 'Token calculation test passed',
      results
    };

  } catch (error) {
    console.error('[Test] Token calculation failed:', error);
    return {
      success: false,
      message: `Token calculation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 통합 테스트 실행
 */
export async function runAllTests(): Promise<{
  success: boolean;
  message: string;
  results: Record<string, unknown>;
}> {
  console.log('[Test] Starting Gemini integration tests...');

  const results = {
    setup: await testGeminiSetup(),
    tokenCalculation: testTokenCalculation(),
    textGeneration: { success: false, message: 'Not executed' }
  };

  // 설정 테스트가 성공한 경우에만 텍스트 생성 테스트 실행
  if (results.setup.success) {
    results.textGeneration = await testBasicTextGeneration();
  }

  const allPassed = results.setup.success && 
                   results.tokenCalculation.success && 
                   results.textGeneration.success;

  console.log('[Test] All tests completed:', {
    setup: results.setup.success,
    tokenCalculation: results.tokenCalculation.success,
    textGeneration: results.textGeneration.success,
    overall: allPassed
  });

  return {
    success: allPassed,
    message: allPassed 
      ? 'All tests passed successfully' 
      : 'Some tests failed - check details',
    results
  };
}

/**
 * 개발용 빠른 테스트
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    return await checkGeminiHealth();
  } catch (error) {
    console.error('[Quick Health Check] Failed:', error);
    return false;
  }
}
