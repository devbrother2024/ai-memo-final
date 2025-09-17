// test-gemini-basic.ts
// Gemini API 기본 연동 테스트

import * as dotenv from 'dotenv';
import { checkGeminiHealth, generateText } from './lib/ai/gemini-client';

// .env.local 파일 로드
dotenv.config({ path: '/Users/macrent/Desktop/ai-memo-hands-on-story-2.5/.env.local' });

// 환경변수 확인
console.log('Environment check:');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '설정됨' : '설정되지 않음');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');

async function testBasicSetup() {
  console.log('🔧 Gemini API 기본 설정 테스트...');
  
  try {
    // 1. 헬스체크
    console.log('1. 헬스체크 실행 중...');
    const isHealthy = await checkGeminiHealth();
    console.log(`   결과: ${isHealthy ? '✅ 정상' : '❌ 실패'}`);
    
    if (!isHealthy) {
      console.log('❌ 헬스체크 실패 - API 키 또는 설정을 확인해주세요.');
      return false;
    }
    
    // 2. 간단한 텍스트 생성
    console.log('2. 텍스트 생성 테스트 중...');
    const response = await generateText('안녕하세요! 간단히 인사해주세요.', 50);
    console.log(`   응답: "${response}"`);
    console.log(`   길이: ${response.length}자`);
    
    if (response && response.length > 0) {
      console.log('✅ 텍스트 생성 성공!');
      return true;
    } else {
      console.log('❌ 텍스트 생성 실패 - 빈 응답');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// 실행
testBasicSetup().then(success => {
  console.log('\n' + '='.repeat(50));
  console.log(success ? '🎉 모든 테스트 통과!' : '😞 테스트 실패');
  console.log('='.repeat(50));
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('실행 오류:', error);
  process.exit(1);
});
