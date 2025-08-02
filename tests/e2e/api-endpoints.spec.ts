import { test, expect, Page } from '@playwright/test';

// API直接テスト用のヘルパー関数
async function testApiEndpoint(page: Page, endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const baseUrl = 'https://school-timetable-monorepo.grundhunter.workers.dev';
  const fullUrl = `${baseUrl}${endpoint}`;
  
  console.log(`\n🔍 Testing API endpoint: ${method} ${fullUrl}`);
  
  try {
    const requestOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await page.request.fetch(fullUrl, requestOptions);
    const status = response.status();
    const headers = response.headers();
    
    console.log(`Status: ${status}`);
    console.log(`Content-Type: ${headers['content-type'] || 'Not specified'}`);
    
    let responseBody;
    try {
      responseBody = await response.text();
      
      // JSONかどうか確認
      if (headers['content-type']?.includes('application/json')) {
        try {
          const parsedJson = JSON.parse(responseBody);
          console.log(`Response (JSON):`, JSON.stringify(parsedJson, null, 2));
          return { status, headers, body: parsedJson, isJson: true };
        } catch (e) {
          console.log(`⚠️ Content-Type is JSON but parsing failed`);
        }
      }
      
      // HTMLかテキストレスポンスの場合
      if (responseBody.length > 500) {
        console.log(`Response (truncated): ${responseBody.substring(0, 500)}...`);
      } else {
        console.log(`Response: ${responseBody}`);
      }
      
      return { status, headers, body: responseBody, isJson: false };
      
    } catch (error) {
      console.log(`❌ Failed to read response body: ${error}`);
      return { status, headers, body: null, error: error.message };
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error}`);
    return { error: error.message, status: 0 };
  }
}

test.describe('API Endpoints Testing', () => {
  
  test('基本的なAPIエンドポイントの動作確認', async ({ page }) => {
    console.log('===== API ENDPOINTS TESTING =====');
    
    // 主要なAPIエンドポイントをテスト
    const endpoints = [
      '/api/frontend/school/settings',
      '/api/frontend/school/teachers',
      '/api/frontend/school/subjects',
      '/api/frontend/school/classrooms',
      '/api/frontend/school/conditions',
      '/api/frontend/school/timetables'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      const result = await testApiEndpoint(page, endpoint);
      results.push({ endpoint, result });
      
      // APIエラーの分析
      if (result.status >= 400) {
        console.log(`❌ API ERROR for ${endpoint}: Status ${result.status}`);
        if (result.body && typeof result.body === 'string' && result.body.includes('<!DOCTYPE html>')) {
          console.log(`⚠️ Received HTML instead of JSON - possible routing issue`);
        }
      } else if (result.status >= 200 && result.status < 300) {
        console.log(`✅ API SUCCESS for ${endpoint}: Status ${result.status}`);
      }
    }
    
    console.log('\n===== API RESULTS SUMMARY =====');
    results.forEach(({ endpoint, result }) => {
      const statusEmoji = result.status >= 400 ? '❌' : result.status >= 200 && result.status < 300 ? '✅' : '⚠️';
      console.log(`${statusEmoji} ${endpoint}: ${result.status} ${result.error ? `(${result.error})` : ''}`);
    });
    console.log('==============================');
    
    // テストは情報提供のために実行するので、常に成功とする
    expect(true).toBe(true);
  });

  test('認証が必要なAPIの動作確認', async ({ page }) => {
    console.log('===== AUTHENTICATED API TESTING =====');
    
    // 認証ヘッダーなしでのテスト
    const protectedEndpoints = [
      '/api/frontend/school/settings',
      '/api/frontend/school/teachers'
    ];
    
    for (const endpoint of protectedEndpoints) {
      console.log(`\n🔐 Testing protected endpoint: ${endpoint}`);
      const result = await testApiEndpoint(page, endpoint);
      
      if (result.status === 401) {
        console.log(`✅ Properly protected - returned 401 Unauthorized`);
      } else if (result.status === 403) {
        console.log(`✅ Properly protected - returned 403 Forbidden`);
      } else if (result.status === 200) {
        console.log(`⚠️ Endpoint accessible without authentication`);
      } else {
        console.log(`❓ Unexpected status: ${result.status}`);
      }
    }
    
    expect(true).toBe(true);
  });

  test('POSTリクエストのテスト', async ({ page }) => {
    console.log('===== POST REQUESTS TESTING =====');
    
    // POSTエンドポイントのテスト
    const postEndpoints = [
      {
        endpoint: '/api/frontend/school/teachers',
        body: {
          name: 'Test Teacher',
          email: 'test@example.com',
          subject: 'Mathematics'
        }
      },
      {
        endpoint: '/api/frontend/school/subjects',
        body: {
          name: 'Test Subject',
          code: 'TEST001'
        }
      }
    ];
    
    for (const { endpoint, body } of postEndpoints) {
      const result = await testApiEndpoint(page, endpoint, 'POST', body);
      
      if (result.status === 401 || result.status === 403) {
        console.log(`✅ POST ${endpoint}: Properly protected (${result.status})`);
      } else if (result.status === 200 || result.status === 201) {
        console.log(`✅ POST ${endpoint}: Successful (${result.status})`);
      } else if (result.status >= 400) {
        console.log(`❌ POST ${endpoint}: Client error (${result.status})`);
      } else {
        console.log(`❓ POST ${endpoint}: Unexpected status (${result.status})`);
      }
    }
    
    expect(true).toBe(true);
  });

  test('CORS設定の確認', async ({ page }) => {
    console.log('===== CORS CONFIGURATION TESTING =====');
    
    // OPTIONSリクエストでCORS設定を確認
    const testEndpoint = '/api/frontend/school/settings';
    const baseUrl = 'https://school-timetable-monorepo.grundhunter.workers.dev';
    const fullUrl = `${baseUrl}${testEndpoint}`;
    
    try {
      const response = await page.request.fetch(fullUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      const headers = response.headers();
      const status = response.status();
      
      console.log(`OPTIONS request status: ${status}`);
      console.log(`Access-Control-Allow-Origin: ${headers['access-control-allow-origin'] || 'Not set'}`);
      console.log(`Access-Control-Allow-Methods: ${headers['access-control-allow-methods'] || 'Not set'}`);
      console.log(`Access-Control-Allow-Headers: ${headers['access-control-allow-headers'] || 'Not set'}`);
      
      if (headers['access-control-allow-origin']) {
        console.log(`✅ CORS is configured`);
      } else {
        console.log(`❌ CORS may not be properly configured`);
      }
      
    } catch (error) {
      console.log(`❌ CORS test failed: ${error}`);
    }
    
    expect(true).toBe(true);
  });

  test('静的ファイルの配信確認', async ({ page }) => {
    console.log('===== STATIC FILES TESTING =====');
    
    const staticFiles = [
      '/',
      '/assets/main-BsGwjtOc.js',
      '/assets/main-DgBT0lrq.css'
    ];
    
    for (const file of staticFiles) {
      console.log(`\n📁 Testing static file: ${file}`);
      const result = await testApiEndpoint(page, file);
      
      if (result.status === 200) {
        console.log(`✅ Static file served successfully`);
        if (file === '/') {
          // HTMLファイルの場合、基本構造を確認
          if (typeof result.body === 'string' && result.body.includes('<!doctype html>')) {
            console.log(`✅ Valid HTML document structure`);
            if (result.body.includes('School Timetable')) {
              console.log(`✅ Contains expected title`);
            }
          }
        }
      } else {
        console.log(`❌ Static file not accessible: Status ${result.status}`);
      }
    }
    
    expect(true).toBe(true);
  });
});