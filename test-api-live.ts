// test-api-live.ts
// 실제 Gemini API 호출 테스트

import * as dotenv from 'dotenv'
import { getGeminiClient, generateText } from './lib/ai/gemini-client'
import { runAllTests } from './lib/ai/test'

// .env.local 파일 로드
dotenv.config({
    path: '/Users/macrent/Desktop/ai-memo-hands-on-story-2.5/.env.local'
})

async function testRealAPICall() {
    console.log('🚀 실제 Gemini API 호출 테스트 시작...\n')

    // 1. 기본 설정 확인
    console.log('1️⃣ 기본 설정 테스트...')
    try {
        const setupResult = await runAllTests()
        if (!setupResult.success) {
            console.log('❌ 기본 설정 실패:', setupResult.message)
            return
        }
        console.log('✅ 기본 설정 완료\n')
    } catch (error) {
        console.log('❌ 설정 오류:', error)
        return
    }

    // 2. 간단한 한국어 텍스트 생성
    console.log('2️⃣ 한국어 텍스트 생성 테스트...')
    try {
        const koreanText = await generateText(
            '간단한 자기소개를 해주세요.',
            100
        )
        console.log('프롬프트: "간단한 자기소개를 해주세요."')
        console.log('응답:', koreanText)
        console.log('길이:', koreanText.length, '자\n')
    } catch (error) {
        console.log('❌ 한국어 테스트 실패:', error)
    }

    // 3. 영어 텍스트 생성
    console.log('3️⃣ 영어 텍스트 생성 테스트...')
    try {
        const englishText = await generateText(
            'Tell me a short story about a cat.',
            150
        )
        console.log('프롬프트: "Tell me a short story about a cat."')
        console.log('응답:', englishText)
        console.log('길이:', englishText.length, '자\n')
    } catch (error) {
        console.log('❌ 영어 테스트 실패:', error)
    }

    // 4. 요약 기능 테스트 (노트 요약용)
    console.log('4️⃣ 요약 기능 테스트...')
    try {
        const longText = `
오늘은 정말 바쁜 하루였다. 아침 8시에 회의가 있었고, 
새로운 프로젝트에 대한 기획을 논의했다. 
팀원들과 함께 브레인스토밍을 진행하면서 다양한 아이디어를 얻을 수 있었다.
점심시간에는 고객과 미팅이 있었고, 제품 개선 사항에 대해 이야기했다.
오후에는 코딩 작업을 집중적으로 진행했고, 
새로운 기능 구현을 완료할 수 있었다.
저녁에는 친구들과 만나서 맛있는 저녁을 함께 먹었다.
    `

        const summary = await generateText(
            `다음 텍스트를 2-3문장으로 요약해주세요:\n\n${longText}`,
            200
        )
        console.log('원본 텍스트 길이:', longText.length, '자')
        console.log('요약 결과:', summary)
        console.log('요약 길이:', summary.length, '자\n')
    } catch (error) {
        console.log('❌ 요약 테스트 실패:', error)
    }

    // 5. 태그 생성 테스트
    console.log('5️⃣ 태그 생성 테스트...')
    try {
        const noteContent = `
새로운 React 프로젝트를 시작했다. 
Next.js와 TypeScript를 사용하여 개발하고 있으며,
상태 관리는 Zustand를 사용하기로 결정했다.
UI는 Tailwind CSS와 shadcn/ui 컴포넌트를 활용할 예정이다.
백엔드는 Supabase를 사용하여 데이터베이스와 인증을 처리한다.
    `

        const tags = await generateText(
            `다음 노트 내용을 분석하여 관련 태그를 3-5개 추천해주세요. 태그는 쉼표로 구분하여 나열해주세요:\n\n${noteContent}`,
            100
        )
        console.log('노트 내용 길이:', noteContent.length, '자')
        console.log('추천 태그:', tags)
        console.log('태그 응답 길이:', tags.length, '자\n')
    } catch (error) {
        console.log('❌ 태그 생성 테스트 실패:', error)
    }

    // 6. 클라이언트 직접 사용 테스트
    console.log('6️⃣ 클라이언트 직접 사용 테스트...')
    try {
        const client = getGeminiClient()

        const response = await client.generateText({
            prompt: '창의적인 프로젝트 아이디어 3가지를 제안해주세요.',
            maxTokens: 300,
            temperature: 0.8
        })

        console.log(
            '프롬프트: "창의적인 프로젝트 아이디어 3가지를 제안해주세요."'
        )
        console.log('응답:', response.text)
        console.log('토큰 사용량:', {
            입력: response.tokens.input,
            출력: response.tokens.output,
            총합: response.tokens.total
        })
        console.log('완료 이유:', response.finishReason, '\n')
    } catch (error) {
        console.log('❌ 클라이언트 직접 사용 테스트 실패:', error)
    }

    console.log('🎉 모든 실제 API 테스트 완료!')
}

// 실행
testRealAPICall().catch(error => {
    console.error('테스트 실행 중 오류:', error)
    process.exit(1)
})
