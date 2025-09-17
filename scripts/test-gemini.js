// scripts/test-gemini.js
// Gemini API 기본 연동 테스트 스크립트
// Node.js 환경에서 실행하여 API 연동 상태를 확인

const { runAllTests } = require('../lib/ai/test.ts')

async function main() {
    console.log('🚀 Gemini API 연동 테스트 시작...\n')

    try {
        const result = await runAllTests()

        console.log('\n📊 테스트 결과:')
        console.log('='.repeat(50))
        console.log(`전체 상태: ${result.success ? '✅ 성공' : '❌ 실패'}`)
        console.log(`메시지: ${result.message}`)

        if (result.results) {
            console.log('\n📋 세부 결과:')
            console.log(
                `- 설정 테스트: ${result.results.setup.success ? '✅' : '❌'}`
            )
            console.log(
                `- 토큰 계산: ${
                    result.results.tokenCalculation.success ? '✅' : '❌'
                }`
            )
            console.log(
                `- 텍스트 생성: ${
                    result.results.textGeneration.success ? '✅' : '❌'
                }`
            )
        }

        if (!result.success) {
            console.log(
                '\n🔍 상세 정보:',
                JSON.stringify(result.results, null, 2)
            )
            process.exit(1)
        }

        console.log('\n🎉 모든 테스트가 성공적으로 완료되었습니다!')
    } catch (error) {
        console.error('\n❌ 테스트 실행 중 오류 발생:', error.message)
        process.exit(1)
    }
}

main()
