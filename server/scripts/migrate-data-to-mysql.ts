/**
 * Data Migration Script: Supabase → MySQL (Railway)
 *
 * Migrates all 6 dashboard tables from Supabase to MySQL
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Supabase config
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// MySQL config
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: { rejectUnauthorized: false }
};

// Tables to migrate (in order due to dependencies)
const TABLES = [
  'protocol_stats',
  'projected_stats',
  'trader_stats',
  'protocol_sync_status',
  'protocol_configurations',
  'launchpad_stats'
];

/**
 * Fetch data from Supabase with pagination
 */
async function fetchFromSupabase(table: string, offset: number = 0, limit: number = 1000): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?offset=${offset}&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${table}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get total count from Supabase
 */
async function getSupabaseCount(table: string): Promise<number> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=count`;

  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    },
    method: 'HEAD'
  });

  const contentRange = response.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    if (match) return parseInt(match[1]);
  }

  return 0;
}

/**
 * Insert batch into MySQL
 */
async function insertBatch(
  pool: mysql.Pool,
  table: string,
  records: any[],
  columns: string[]
): Promise<number> {
  if (records.length === 0) return 0;

  const placeholders = records.map(() =>
    `(${columns.map(() => '?').join(', ')})`
  ).join(', ');

  const values = records.flatMap(r => columns.map(c => {
    const val = r[c];
    // Handle null/undefined
    if (val === null || val === undefined) return null;
    // Handle dates
    if (c === 'date' || c === 'formatted_day' || c === 'latest_data_date') {
      return val ? val.split('T')[0] : null;
    }
    // Handle timestamps
    if (c.includes('_at') || c === 'created_at' || c === 'updated_at') {
      return val ? new Date(val).toISOString().slice(0, 19).replace('T', ' ') : null;
    }
    return val;
  }));

  // Use INSERT IGNORE to skip duplicates
  const sql = `INSERT IGNORE INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;

  const [result] = await pool.execute(sql, values);
  return (result as any).affectedRows;
}

/**
 * Migrate a single table
 */
async function migrateTable(pool: mysql.Pool, table: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migrating: ${table}`);
  console.log('='.repeat(60));

  // Get column info from MySQL
  const [columns] = await pool.execute(`DESCRIBE ${table}`);
  const columnNames = (columns as any[])
    .map(c => c.Field)
    .filter(c => c !== 'id' || table === 'protocol_sync_status'); // Skip auto-increment id except for protocol_sync_status

  // For protocol_configurations, we need to include id since it's UUID
  const columnsToFetch = table === 'protocol_configurations'
    ? columnNames
    : columnNames.filter(c => c !== 'id');

  console.log(`Columns: ${columnsToFetch.join(', ')}`);

  // Fetch and insert in batches
  const BATCH_SIZE = 1000;
  let offset = 0;
  let totalMigrated = 0;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchFromSupabase(table, offset, BATCH_SIZE);

    if (data.length === 0) {
      hasMore = false;
      break;
    }

    // Filter to only columns we want
    const filteredData = data.map(row => {
      const filtered: any = {};
      for (const col of columnsToFetch) {
        if (row.hasOwnProperty(col)) {
          filtered[col] = row[col];
        }
      }
      return filtered;
    });

    const inserted = await insertBatch(pool, table, filteredData, columnsToFetch);
    totalMigrated += inserted;
    offset += BATCH_SIZE;

    process.stdout.write(`\rMigrated: ${totalMigrated} rows (batch ${Math.ceil(offset / BATCH_SIZE)})`);

    if (data.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log(`\n✓ ${table}: ${totalMigrated} rows migrated`);
}

/**
 * Main migration function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Supabase → MySQL Data Migration                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nSource: ${SUPABASE_URL}`);
  console.log(`Target: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`);

  // Create MySQL connection pool
  const pool = mysql.createPool(MYSQL_CONFIG);

  try {
    // Test connection
    console.log('\nTesting MySQL connection...');
    await pool.execute('SELECT 1');
    console.log('✓ MySQL connection successful');

    // Migrate each table
    for (const table of TABLES) {
      await migrateTable(pool, table);
    }

    // Final counts
    console.log('\n' + '='.repeat(60));
    console.log('Migration Complete! Final row counts:');
    console.log('='.repeat(60));

    for (const table of TABLES) {
      const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${(rows as any)[0].count} rows`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
main().catch(console.error);
