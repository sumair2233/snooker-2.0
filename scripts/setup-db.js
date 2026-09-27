const fs = require('fs');
const path = require('path');
const { sql } = require('@vercel/postgres');

async function runSchema() {
  console.log('Connecting to Neon PostgreSQL and creating schema...');
  
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  // Split schema into individual executable statements
  const statements = schemaContent
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      const withoutComments = s.replace(/--.*$/gm, '').trim();
      return withoutComments.length > 0;
    });

  console.log(`Found ${statements.length} SQL statements to execute.`);

  let successCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const cleaned = stmt.replace(/^--.*$/gm, '').trim();
    const firstLine = cleaned.split('\n')[0].substring(0, 60);

    try {
      await sql.query(stmt);
      console.log(`[OK] Statement ${i + 1}/${statements.length}: ${firstLine}...`);
      successCount++;
    } catch (err) {
      console.error(`[ERROR] Statement ${i + 1}/${statements.length} (${firstLine}):`, err.message);
    }
  }

  console.log(`\nDone! Successfully executed ${successCount}/${statements.length} statements.`);

  // Verify created tables
  try {
    const res = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\nCreated tables in Neon PostgreSQL:');
    res.rows.forEach(r => console.log(' - ' + r.table_name));
  } catch (err) {
    console.error('Failed to list tables:', err.message);
  }
}

runSchema();
