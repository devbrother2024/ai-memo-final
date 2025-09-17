// test-korean-specific.ts
// 한국어 처리 특화 테스트

import * as dotenv from 'dotenv'
import { getGeminiClient } from './lib/ai/gemini-client'

// .env.local 파일 로드
dotenv.config({
    path: '/Users/macrent/Desktop/ai-memo-hands-on-story-2.5/.env.local'
})

async function testKoreanProcessing() {
    console.log('🇰🇷 한국어 처리 특화 테스트 시작...\n')

    const client = getGeminiClient()

    // 1. 명시적 한국어 지시
    console.log('1️⃣ 명시적 한국어 지시 테스트...')
    try {
        const response = await client.generateText({
            prompt: '한국어로 답변해주세요. 오늘 날씨가 어떤가요?',
            maxTokens: 100,
            temperature: 0.7
        })

        console.log('프롬프트: "한국어로 답변해주세요. 오늘 날씨가 어떤가요?"')
        console.log('응답:', response.text)
        console.log('토큰 사용량:', response.tokens, '\n')
    } catch (error) {
        console.log('❌ 테스트 실패:', error, '\n')
    }

    // 2. 시스템 메시지 스타일로 한국어 강제
    console.log('2️⃣ 시스템 메시지 스타일 테스트...')
    try {
        const response = await client.generateText({
            prompt: `당신은 한국어로만 답변하는 AI 어시스턴트입니다. 
질문: 간단한 자기소개를 해주세요.
답변 (한국어로):`,
            maxTokens: 150,
            temperature: 0.5
        })

        console.log('프롬프트: 시스템 메시지 + 한국어 강제')
        console.log('응답:', response.text)
        console.log('토큰 사용량:', response.tokens, '\n')
    } catch (error) {
        console.log('❌ 테스트 실패:', error, '\n')
    }

    // 3. 영어 프롬프트로 한국어 요청
    console.log('3️⃣ 영어 프롬프트로 한국어 요청 테스트...')
    try {
        const response = await client.generateText({
            prompt: 'Please respond in Korean. Tell me about your capabilities.',
            maxTokens: 150,
            temperature: 0.7
        })

        console.log(
            '프롬프트: "Please respond in Korean. Tell me about your capabilities."'
        )
        console.log('응답:', response.text)
        console.log('토큰 사용량:', response.tokens, '\n')
    } catch (error) {
        console.log('❌ 테스트 실패:', error, '\n')
    }

    // 4. 요약 테스트 (한국어 강제)
    console.log('4️⃣ 한국어 요약 테스트...')
    try {
        const longText = `
    오늘은 회사에서 새로운 프로젝트 킥오프 미팅이 있었다. 
    AI 기반 메모 앱을 개발하는 프로젝트로, React와 TypeScript를 사용한다.
    백엔드는 Supabase를 활용하고, AI API는 Google Gemini를 연동할 예정이다.
    팀원들과 기술 스택과 일정을 논의했고, 2주 안에 MVP를 완성하기로 했다.
    개발 과정에서 사용자 피드백을 적극 반영할 계획이다.
    `

        const response = await client.generateText({
            prompt: `다음 텍스트를 한국어로 2-3문장으로 요약해주세요:

${longText}

요약 (한국어):`,
            maxTokens: 200,
            temperature: 0.3
        })

        console.log('요약 대상 텍스트 길이:', longText.trim().length, '자')
        console.log('요약 결과:', response.text)
        console.log('토큰 사용량:', response.tokens, '\n')
    } catch (error) {
        console.log('❌ 테스트 실패:', error, '\n')
    }

    // 5. 태그 생성 테스트 (한국어)
    console.log('5️⃣ 한국어 태그 생성 테스트...')
    try {
        const noteContent = `
    새로운 React 프로젝트 시작
    - Next.js 14 사용
    - TypeScript 적용
    - Tailwind CSS 스타일링
    - Supabase 백엔드
    - Vercel 배포 예정
    `

        const response = await client.generateText({
            prompt: `다음 노트의 핵심 키워드를 한국어로 3-5개 추출해주세요. 쉼표로 구분하여 나열해주세요:

${noteContent}

키워드 (한국어):`,
            maxTokens: 100,
            temperature: 0.3
        })

        console.log('노트 내용:', noteContent.trim())
        console.log('추출된 키워드:', response.text)
        console.log('토큰 사용량:', response.tokens, '\n')
    } catch (error) {
        console.log('❌ 테스트 실패:', error, '\n')
    }

    // 6. 다양한 온도 설정 테스트
    console.log('6️⃣ 온도별 응답 차이 테스트...')
    const temperatures = [0.1, 0.5, 0.9]

    for (const temp of temperatures) {
        try {
            const response = await client.generateText({
                prompt: '한국어로 답변해주세요. 창의적인 앱 아이디어 하나를 제안해주세요.',
                maxTokens: 100,
                temperature: temp
            })

            console.log(
                `온도 ${temp}:`,
                response.text.substring(0, 100) + '...'
            )
        } catch (error) {
            console.log(`❌ 온도 ${temp} 테스트 실패:`, error)
        }
    }

    console.log('\n🎉 한국어 특화 테스트 완료!')
}

// 실행
testKoreanProcessing().catch(error => {
    console.error('테스트 실행 중 오류:', error)
    process.exit(1)
})
