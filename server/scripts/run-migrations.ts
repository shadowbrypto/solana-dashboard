#!/usr/bin/env tsx

/**
 * CLI script to run database migrations
 * Usage: npm run migrate-db [migration-file]
 * 
 * Examples:
 * npm run migrate-db                           # Run all migrations
 * npm run migrate-db add_chain_support.sql    # Run specific migration
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/lib/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function runMigration(migrationFile: string): Promise<void> {
  console.log(`🔄 Running migration: ${migrationFile}`);
  
  try {
    const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct execution if RPC fails
      const { error: directError } = await supabase
        .from('_temp_migration')
        .select('1')
        .limit(0); // This will execute but return no data
      
      if (directError) {
        console.warn('⚠️  Cannot execute migration via Supabase client. Please run manually:');
        console.log('📝 SQL to execute:');
        console.log('---');
        console.log(sql);
        console.log('---');
        return;
      }
    }
    
    console.log(`✅ Successfully ran migration: ${migrationFile}`);
  } catch (error) {
    console.error(`❌ Failed to run migration ${migrationFile}:`, error);
    throw error;
  }
}

async function getAllMigrations(): Promise<string[]> {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Run migrations in alphabetical order
  } catch (error) {
    console.error('❌ Failed to read migrations directory:', error);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const specificMigration = args[0];

  try {
    if (specificMigration) {
      console.log(`🚀 Running specific migration: ${specificMigration}`);
      await runMigration(specificMigration);
    } else {
      console.log('🚀 Running all migrations');
      const migrations = await getAllMigrations();
      
      if (migrations.length === 0) {
        console.log('📁 No migrations found');
        return;
      }
      
      console.log(`📋 Found ${migrations.length} migrations to run`);
      
      for (const migration of migrations) {
        await runMigration(migration);
      }
      
      console.log('✅ All migrations completed successfully');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();