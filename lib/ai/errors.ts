// lib/ai/errors.ts
// AI 관련 에러 타입 및 클래스 정의
// Gemini API 호출 시 발생할 수 있는 다양한 에러를 분류하고 처리
// 관련 파일: lib/ai/gemini-client.ts, lib/ai/types.ts, lib/ai/utils.ts

/**
 * Gemini API 에러 타입
 */
export enum GeminiErrorType {
    API_KEY_INVALID = 'API_KEY_INVALID',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    TIMEOUT = 'TIMEOUT',
    CONTENT_FILTERED = 'CONTENT_FILTERED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Gemini API 에러 클래스
 */
export class GeminiError extends Error {
    constructor(
        public type: GeminiErrorType,
        message: string,
        public originalError?: unknown,
        public retryable: boolean = false
    ) {
        super(message)
        this.name = 'GeminiError'
    }

    /**
     * 에러가 재시도 가능한지 확인
     */
    isRetryable(): boolean {
        return (
            this.retryable &&
            [
                GeminiErrorType.TIMEOUT,
                GeminiErrorType.NETWORK_ERROR,
                GeminiErrorType.SERVICE_UNAVAILABLE
            ].includes(this.type)
        )
    }

    /**
     * 에러 정보를 JSON으로 변환
     */
    toJSON() {
        return {
            type: this.type,
            message: this.message,
            retryable: this.retryable,
            timestamp: new Date().toISOString()
        }
    }
}

/**
 * 원본 에러에서 Gemini 에러 타입 추론
 */
export function inferErrorType(error: unknown): GeminiErrorType {
    if (!error) return GeminiErrorType.UNKNOWN

    const errorObj = error as Record<string, unknown>
    const message = (
        typeof errorObj?.message === 'string' ? errorObj.message : ''
    ).toLowerCase()
    const status =
        typeof errorObj?.status === 'number'
            ? errorObj.status
            : typeof errorObj?.statusCode === 'number'
            ? errorObj.statusCode
            : undefined

    // HTTP 상태 코드 기반 분류
    if (
        status === 401 ||
        message.includes('unauthorized') ||
        message.includes('api key')
    ) {
        return GeminiErrorType.API_KEY_INVALID
    }

    if (
        status === 429 ||
        message.includes('quota') ||
        message.includes('rate limit')
    ) {
        return message.includes('quota')
            ? GeminiErrorType.QUOTA_EXCEEDED
            : GeminiErrorType.RATE_LIMIT_EXCEEDED
    }

    if (status === 400 || message.includes('invalid')) {
        return GeminiErrorType.INVALID_REQUEST
    }

    if (
        (status !== undefined && status >= 500) ||
        message.includes('service unavailable') ||
        message.includes('internal server')
    ) {
        return GeminiErrorType.SERVICE_UNAVAILABLE
    }

    // 메시지 내용 기반 분류
    if (message.includes('timeout') || message.includes('timed out')) {
        return GeminiErrorType.TIMEOUT
    }

    if (message.includes('content') && message.includes('filter')) {
        return GeminiErrorType.CONTENT_FILTERED
    }

    if (message.includes('network') || message.includes('connection')) {
        return GeminiErrorType.NETWORK_ERROR
    }

    if (message.includes('token') && message.includes('limit')) {
        return GeminiErrorType.TOKEN_LIMIT_EXCEEDED
    }

    return GeminiErrorType.UNKNOWN
}

/**
 * 재시도 불가능한 에러인지 확인
 */
export function isNonRetryableError(error: unknown): boolean {
    if (error instanceof GeminiError) {
        return !error.isRetryable()
    }

    const errorType = inferErrorType(error)
    return [
        GeminiErrorType.API_KEY_INVALID,
        GeminiErrorType.CONTENT_FILTERED,
        GeminiErrorType.TOKEN_LIMIT_EXCEEDED,
        GeminiErrorType.INVALID_REQUEST
    ].includes(errorType)
}

/**
 * 에러에서 사용자 친화적 메시지 생성
 */
export function getErrorMessage(error: GeminiError | unknown): string {
    if (error instanceof GeminiError) {
        switch (error.type) {
            case GeminiErrorType.API_KEY_INVALID:
                return 'API 키가 유효하지 않습니다. 설정을 확인해주세요.'
            case GeminiErrorType.QUOTA_EXCEEDED:
                return 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
            case GeminiErrorType.RATE_LIMIT_EXCEEDED:
                return '요청 속도 제한을 초과했습니다. 잠시 후 다시 시도해주세요.'
            case GeminiErrorType.TIMEOUT:
                return '요청 시간이 초과되었습니다. 다시 시도해주세요.'
            case GeminiErrorType.CONTENT_FILTERED:
                return '콘텐츠가 필터링되었습니다. 다른 내용으로 시도해주세요.'
            case GeminiErrorType.TOKEN_LIMIT_EXCEEDED:
                return '텍스트가 너무 깁니다. 더 짧은 내용으로 시도해주세요.'
            case GeminiErrorType.SERVICE_UNAVAILABLE:
                return 'AI 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'
            default:
                return 'AI 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
        }
    }

    return 'AI 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
}
