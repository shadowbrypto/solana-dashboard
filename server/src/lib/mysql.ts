// Load environment variables first
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the server root directory
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const mysqlHost = process.env.MYSQL_HOST;
const mysqlPort = parseInt(process.env.MYSQL_PORT || '3306');
const mysqlUser = process.env.MYSQL_USER;
const mysqlPassword = process.env.MYSQL_PASSWORD;
const mysqlDatabase = process.env.MYSQL_DATABASE;

// Debug logging for environment variables
console.log('MySQL Environment Check:', {
  hasMysqlHost: !!mysqlHost,
  hasMysqlUser: !!mysqlUser,
  hasMysqlPassword: !!mysqlPassword,
  hasMysqlDatabase: !!mysqlDatabase,
  port: mysqlPort
});

if (!mysqlHost || !mysqlUser || !mysqlPassword || !mysqlDatabase) {
  console.error('Missing MySQL environment variables:', {
    MYSQL_HOST: !!mysqlHost,
    MYSQL_USER: !!mysqlUser,
    MYSQL_PASSWORD: !!mysqlPassword,
    MYSQL_DATABASE: !!mysqlDatabase
  });
  throw new Error('Missing MySQL environment variables');
}

// Create MySQL connection pool
const pool = mysql.createPool({
  host: mysqlHost,
  port: mysqlPort,
  user: mysqlUser,
  password: mysqlPassword,
  database: mysqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Railway MySQL requires SSL
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('MySQL connection established successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Failed to establish MySQL connection:', err.message);
  });

export default pool;
