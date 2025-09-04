// 基本ルートテスト（どのエンドポイントが利用可能かをテスト）
async function testBasicRoutes() {
  console.log('🔍 基本ルートをテスト...');
  
  const routes = [
    '/api/', // backend/index.tsx root
    '/api/health', // health check
    '/api/temp-auth/debug', // our new debug endpoint
    '/api/temp-auth/login', // our new login endpoint
    '/api/auth/debug', // old auth path
    '/api/auth/login' // old auth path
  ];
  
  for (const route of routes) {
    try {
      const response = await fetch(`http://localhost:38681${route}`);
      console.log(`📍 ${route}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Response:`, data);
      }
    } catch (error) {
      console.log(`❌ ${route}: Error - ${error.message}`);
    }
  }
}

testBasicRoutes().then(() => process.exit(0));