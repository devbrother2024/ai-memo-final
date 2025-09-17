// lib/ai/gemini-client.ts
// Google Gemini API 클라이언트 구현
// API 호출, 에러 처리, 토큰 관리, 헬스체크 등 핵심 기능 제공
// 관련 파일: lib/ai/types.ts, lib/ai/errors.ts, lib/ai/config.ts, lib/ai/utils.ts

import { GoogleGenAI } from '@google/genai'
import {
    AIService,
    GeminiRequestOptions,
    GeminiResponse,
    APIUsageLog
} from './types'
import { GeminiError, GeminiErrorType, inferErrorType } from './errors'
import { getGeminiConfig, logConfigInfo } from './config'
import {
    estimateTokens,
    validateAndAdjustTokens,
    withRetry,
    logAPIUsage,
    sanitizeText,
    createTimer,
    estimateCost
} from './utils'

/**
 * Gemini API 클라이언트
 */
export class GeminiClient implements AIService {
    private client: GoogleGenAI
    private config: ReturnType<typeof getGeminiConfig>
    private initialized: boolean = false

    constructor() {
        this.config = getGeminiConfig()
        this.client = new GoogleGenAI({
            apiKey: this.config.apiKey
        })
        this.init()
    }

    /**
     * 클라이언트 초기화
     */
    private init(): void {
        try {
            logConfigInfo(this.config)
            this.initialized = true
        } catch (error) {
            throw new GeminiError(
                GeminiErrorType.API_KEY_INVALID,
                'Failed to initialize Gemini client',
                error
            )
        }
    }

    /**
     * 설정 정보 반환
     */
    getConfig() {
        return { ...this.config }
    }

    /**
     * 헬스체크 실행
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.generateText({
                prompt: 'Hello',
                maxTokens: 10
            })

            return result.text.length > 0
        } catch (error) {
            console.error('[Gemini Health Check] Failed:', error)
            return false
        }
    }

    /**
     * 텍스트 생성
     */
    async generateText(options: GeminiRequestOptions): Promise<GeminiResponse> {
        if (!this.initialized) {
            throw new GeminiError(
                GeminiErrorType.API_KEY_INVALID,
                'Client not initialized'
            )
        }

        const timer = createTimer()
        const sanitizedPrompt = sanitizeText(options.prompt)

        // 토큰 검증 및 조정
        const tokenValidation = validateAndAdjustTokens(
            sanitizedPrompt,
            options.maxTokens || this.config.maxTokens
        )

        const finalPrompt = tokenValidation.adjustedText || sanitizedPrompt
        const inputTokens = estimateTokens(finalPrompt)

        const log: APIUsageLog = {
            timestamp: new Date(),
            model: this.config.model,
            inputTokens,
            outputTokens: 0,
            latencyMs: 0,
            success: false
        }

        try {
            const response = await withRetry(
                () => this.makeAPICall(finalPrompt, options),
                3,
                1000
            )

            const outputTokens = estimateTokens(response.text)
            const latencyMs = timer.stop()

            log.outputTokens = outputTokens
            log.latencyMs = latencyMs
            log.success = true

            logAPIUsage(log)

            return {
                text: response.text,
                tokens: {
                    input: inputTokens,
                    output: outputTokens,
                    total: inputTokens + outputTokens
                },
                finishReason:
                    (response.finishReason as
                        | 'STOP'
                        | 'MAX_TOKENS'
                        | 'SAFETY'
                        | 'RECITATION'
                        | 'OTHER') || 'STOP',
                safetyRatings: response.safetyRatings
            }
        } catch (error) {
            log.latencyMs = timer.stop()
            log.error = error instanceof Error ? error.message : String(error)
            log.success = false

            logAPIUsage(log)

            if (error instanceof GeminiError) {
                throw error
            }

            const errorType = inferErrorType(error)
            throw new GeminiError(errorType, `API call failed: ${error}`, error)
        }
    }

    /**
     * 실제 API 호출
     */
    private async makeAPICall(prompt: string, options: GeminiRequestOptions) {
        // 타임아웃 설정
        const controller = new AbortController()
        const timeoutId = setTimeout(
            () => controller.abort(),
            this.config.timeout
        )

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (this.client.models.generateContent as any)({
                model: this.config.model,
                contents: [{ parts: [{ text: prompt }] }],
                generation_config: {
                    max_output_tokens:
                        options.maxTokens || this.config.maxTokens,
                    temperature: options.temperature || 0.7,
                    top_p: options.topP || 0.8,
                    stop_sequences: options.stopSequences
                }
            })

            clearTimeout(timeoutId)

            const text = response.text

            if (!text) {
                throw new GeminiError(
                    GeminiErrorType.CONTENT_FILTERED,
                    'No text generated - content may have been filtered'
                )
            }

            return {
                text,
                finishReason: 'STOP', // @google/genai 패키지는 다른 형식일 수 있음
                safetyRatings: undefined // 필요시 나중에 추가
            }
        } catch (error) {
            clearTimeout(timeoutId)

            if (error instanceof Error && error.name === 'AbortError') {
                throw new GeminiError(
                    GeminiErrorType.TIMEOUT,
                    `Request timed out after ${this.config.timeout}ms`
                )
            }

            throw error
        }
    }

    /**
     * 배치 텍스트 생성 (여러 프롬프트 동시 처리)
     */
    async generateTextBatch(
        requests: GeminiRequestOptions[]
    ): Promise<GeminiResponse[]> {
        if (requests.length === 0) return []

        // 병렬 처리 (최대 5개씩)
        const batchSize = 5
        const results: GeminiResponse[] = []

        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize)
            const batchPromises = batch.map(request =>
                this.generateText(request)
            )

            try {
                const batchResults = await Promise.all(batchPromises)
                results.push(...batchResults)
            } catch (error) {
                console.error(
                    `[Batch ${Math.floor(i / batchSize) + 1}] Failed:`,
                    error
                )
                throw error
            }
        }

        return results
    }

    /**
     * 스트리밍 텍스트 생성 (미래 확장용)
     */
    async generateTextStream(
        options: GeminiRequestOptions,
        onChunk: (chunk: string) => void
    ): Promise<GeminiResponse> {
        // TODO: 스트리밍 구현
        // 현재는 일반 생성으로 대체
        const response = await this.generateText(options)
        onChunk(response.text)
        return response
    }

    /**
     * 비용 추정
     */
    estimateRequestCost(prompt: string, maxTokens?: number): number {
        const inputTokens = estimateTokens(prompt)
        const estimatedOutputTokens = Math.min(
            maxTokens || this.config.maxTokens,
            inputTokens * 0.5 // 보통 출력이 입력의 50% 정도
        )

        return estimateCost(
            {
                input: inputTokens,
                output: estimatedOutputTokens,
                total: inputTokens + estimatedOutputTokens
            },
            this.config.model
        )
    }
}

/**
 * 싱글톤 클라이언트 인스턴스
 */
let clientInstance: GeminiClient | null = null

/**
 * Gemini 클라이언트 인스턴스 가져오기
 */
export function getGeminiClient(): GeminiClient {
    if (!clientInstance) {
        clientInstance = new GeminiClient()
    }
    return clientInstance
}

/**
 * 간편 텍스트 생성 함수
 */
export async function generateText(
    prompt: string,
    maxTokens?: number
): Promise<string> {
    const client = getGeminiClient()
    const response = await client.generateText({
        prompt,
        maxTokens
    })
    return response.text
}

/**
 * 헬스체크 함수
 */
export async function checkGeminiHealth(): Promise<boolean> {
    try {
        const client = getGeminiClient()
        return await client.healthCheck()
    } catch (error) {
        console.error('[Gemini Health Check] Error:', error)
        return false
    }
}
