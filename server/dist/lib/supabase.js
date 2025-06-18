// Load environment variables first
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from the server root directory
dotenv.config({ path: join(__dirname, '..', '..', '.env') });
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}
export const supabase = createClient(supabaseUrl, supabaseKey);
//# sourceMappingURL=supabase.js.map