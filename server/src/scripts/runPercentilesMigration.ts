import { supabase } from '../lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function runPercentilesMigration() {
  try {
    console.log('Running percentiles migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../migrations/create_percentiles_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Migration failed:', error);
      throw error;
    }
    
    console.log('Migration completed successfully!');
    console.log('Percentiles table created and populated with data for axiom and photon protocols');
    
    // Verify the data
    const { data: axoimData, error: axiomError } = await supabase
      .from('protocol_percentiles')
      .select('*')
      .eq('protocol_name', 'axiom')
      .order('percentile');
    
    if (axiomError) {
      console.warn('Could not verify axiom data:', axiomError);
    } else {
      console.log(`Axiom percentiles created: ${axoimData?.length || 0} records`);
    }
    
  } catch (error) {
    console.error('Failed to run migration:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runPercentilesMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default runPercentilesMigration;