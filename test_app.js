// test_app.js - Comprehensive test of the local CueZone server
const http = require('http');

function request(method, path, body = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed || raw
        });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing Login Page GET / ---');
  const loginPage = await request('GET', '/');
  console.log('Status:', loginPage.status, 'Body length:', loginPage.data.length);
  if (loginPage.status !== 200 || !loginPage.data.includes('CueZone — Sign in')) {
    throw new Error('Failed to load login page');
  }
  console.log('✅ Login page loaded successfully');

  console.log('\n--- 2. Testing Admin Login POST /api/auth/login ---');
  const adminLogin = await request('POST', '/api/auth/login', { username: 'admindemo', password: 'admindemo', role: 'admin' });
  console.log('Admin login status:', adminLogin.status, 'Response:', adminLogin.data);
  if (adminLogin.status !== 200 || !adminLogin.data.ok) throw new Error('Admin login failed');
  const adminCookie = adminLogin.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
  console.log('✅ Admin authenticated with cookie:', adminCookie);

  console.log('\n--- 3. Testing Admin Portal GET /admin ---');
  const adminPage = await request('GET', '/admin', null, adminCookie);
  console.log('Admin portal status:', adminPage.status, 'Length:', adminPage.data.length);
  if (adminPage.status !== 200 || !adminPage.data.includes('CueZone — Admin')) {
    throw new Error('Failed to load admin portal');
  }
  console.log('✅ Admin portal loaded successfully');

  console.log('\n--- 4. Testing Employee Login POST /api/auth/login ---');
  const empLogin = await request('POST', '/api/auth/login', { username: 'emp786', password: 'emp786', role: 'employee' });
  console.log('Employee login status:', empLogin.status, 'Response:', empLogin.data);
  if (empLogin.status !== 200 || !empLogin.data.ok) throw new Error('Employee login failed');
  const empCookie = empLogin.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
  console.log('✅ Employee authenticated with cookie:', empCookie);

  console.log('\n--- 5. Testing Employee Portal GET /employee ---');
  const empPage = await request('GET', '/employee', null, empCookie);
  console.log('Employee portal status:', empPage.status, 'Length:', empPage.data.length);
  if (empPage.status !== 200 || !empPage.data.includes('CueZone — Employee')) {
    throw new Error('Failed to load employee portal');
  }
  console.log('✅ Employee portal loaded successfully');

  console.log('\n--- 6. Testing Tables API GET /api/tables ---');
  const tables = await request('GET', '/api/tables', null, empCookie);
  console.log('Tables status:', tables.status, 'Table count:', tables.data.length);
  tables.data.forEach(t => console.log(`  - [ID ${t.id}] ${t.name}: rate_game = ${t.rate_game}, rate_min = ${t.rate_min}`));
  if (tables.data.length < 5) throw new Error('Expected 5 seeded tables');
  console.log('✅ Tables API functioning properly');

  console.log('\n--- 7. Testing Game Lifecycle (Start -> Active -> End) ---');
  const targetTable = tables.data[0];
  const startRes = await request('POST', '/api/games/start', {
    table_id: targetTable.id,
    game_type: 'single',
    rate_type: 'game',
    player1: 'Ali',
    player2: 'Hamza',
    start_time: '14:00'
  }, empCookie);
  console.log('Start game response:', startRes.data);
  if (!startRes.data.ok) throw new Error('Failed to start game');
  const gameId = startRes.data.game.id;
  console.log('Started Game ID:', gameId);

  const activeRes = await request('GET', '/api/games/active', null, empCookie);
  console.log('Active games count:', activeRes.data.length);
  const foundActive = activeRes.data.find(g => g.id === gameId);
  if (!foundActive) throw new Error('Game did not appear in active games');
  console.log('Found active game on table:', foundActive.table_name);

  // End Game
  const endRes = await request('PUT', `/api/games/${gameId}/end`, {
    winner: 'Ali',
    loser: 'Hamza',
    end_time: '14:45',
    duration: 45,
    amount: targetTable.rate_game,
    payment_status: 'paid',
    payment_method: 'cash',
    paid_cash: targetTable.rate_game
  }, empCookie);
  console.log('End game response:', endRes.data);
  if (!endRes.data.ok) throw new Error('Failed to end game');
  console.log('✅ Game started, ran, and ended successfully');

  console.log('\n--- 8. Testing Cafe Order & Stock Update ---');
  const inventory = await request('GET', '/api/cafe/inventory', null, empCookie);
  const item = inventory.data[0];
  console.log(`Ordering item: ${item.name} (Stock: ${item.stock}, Price: ${item.price})`);

  const orderRes = await request('POST', '/api/cafe/orders', {
    table_id: targetTable.id,
    player_name: 'Ali',
    payment_method: 'cash',
    items: [{ id: item.id, name: item.name, price: item.price, qty: 2 }]
  }, empCookie);
  console.log('Order created:', orderRes.data);

  const invAfter = await request('GET', '/api/cafe/inventory', null, empCookie);
  const itemAfter = invAfter.data.find(it => it.id === item.id);
  console.log(`Stock before: ${item.stock}, after: ${itemAfter.stock}`);
  if (itemAfter.stock !== item.stock - 2) throw new Error('Stock did not decrease properly');
  console.log('✅ Cafe order and inventory stock tracking verified');

  console.log('\n--- 9. Testing Dashboard KPI Metrics ---');
  const dashRes = await request('GET', '/api/reports/dashboard?shift=1', null, adminCookie);
  console.log('Dashboard summary:', dashRes.data);
  if (dashRes.data.cashSale <= 0) throw new Error('Cash sale not updated in dashboard');
  console.log('✅ Real-time dashboard KPI metrics verified');

  console.log('\n=============================================');
  console.log('🎉 ALL SYSTEM TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
