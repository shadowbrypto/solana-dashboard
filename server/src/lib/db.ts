import pool from './mysql.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

/**
 * Database abstraction layer for MySQL
 * Provides helper functions similar to Supabase query builder
 */
export const db = {
  /**
   * Execute a SELECT query and return typed results
   */
  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params || []);
    return rows as T[];
  },

  /**
   * Execute a SELECT query and return a single result (or null)
   */
  async queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  },

  /**
   * Execute INSERT/UPDATE/DELETE and return result metadata
   */
  async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
    const [result] = await pool.execute<ResultSetHeader>(sql, params || []);
    return result;
  },

  /**
   * Count rows matching a condition
   */
  async count(table: string, where?: string, params?: any[]): Promise<number> {
    const sql = where
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params || []);
    return (rows[0] as any).count;
  },

  /**
   * Insert a single record
   */
  async insert(table: string, data: Record<string, any>): Promise<ResultSetHeader> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    return this.execute(sql, values);
  },

  /**
   * Insert a single record and return it (with auto-generated id)
   */
  async insertReturning<T>(table: string, data: Record<string, any>): Promise<T> {
    const result = await this.insert(table, data);
    const insertedId = result.insertId;

    // Fetch the inserted row
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM ${table} WHERE id = ?`,
      [insertedId]
    );
    return rows[0] as T;
  },

  /**
   * Update records matching a condition
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: string,
    whereParams?: any[]
  ): Promise<ResultSetHeader> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    return this.execute(sql, [...values, ...(whereParams || [])]);
  },

  /**
   * Delete records matching a condition
   */
  async delete(table: string, where: string, params?: any[]): Promise<ResultSetHeader> {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    return this.execute(sql, params || []);
  },

  /**
   * Upsert a single record (INSERT ... ON DUPLICATE KEY UPDATE)
   * @param table Table name
   * @param data Record to upsert
   * @param uniqueKeys Column names that form the unique constraint (not updated on conflict)
   */
  async upsert(
    table: string,
    data: Record<string, any>,
    uniqueKeys: string[]
  ): Promise<ResultSetHeader> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    // Build UPDATE clause (exclude unique keys from updates)
    const updates = keys
      .filter(k => !uniqueKeys.includes(k))
      .map(k => `${k} = VALUES(${k})`)
      .join(', ');

    const sql = updates
      ? `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`
      : `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${keys[0]} = ${keys[0]}`;

    return this.execute(sql, values);
  },

  /**
   * Upsert a single record and return it
   */
  async upsertReturning<T>(
    table: string,
    data: Record<string, any>,
    uniqueKeys: string[],
    returnKey: string = 'id'
  ): Promise<T | null> {
    await this.upsert(table, data, uniqueKeys);

    // Build WHERE clause from unique keys
    const whereClause = uniqueKeys.map(k => `${k} = ?`).join(' AND ');
    const whereParams = uniqueKeys.map(k => data[k]);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM ${table} WHERE ${whereClause}`,
      whereParams
    );
    return rows.length > 0 ? rows[0] as T : null;
  },

  /**
   * Batch upsert multiple records
   * @param table Table name
   * @param records Array of records to upsert
   * @param uniqueKeys Column names that form the unique constraint
   * @param chunkSize Maximum records per INSERT statement (default: 1000)
   */
  async batchUpsert(
    table: string,
    records: Record<string, any>[],
    uniqueKeys: string[],
    chunkSize: number = 1000
  ): Promise<{ affectedRows: number }> {
    if (records.length === 0) return { affectedRows: 0 };

    let totalAffected = 0;
    const keys = Object.keys(records[0]);

    // Build UPDATE clause (exclude unique keys)
    const updates = keys
      .filter(k => !uniqueKeys.includes(k))
      .map(k => `${k} = VALUES(${k})`)
      .join(', ');

    // Process in chunks
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      const placeholders = chunk.map(() =>
        `(${keys.map(() => '?').join(', ')})`
      ).join(', ');

      const values = chunk.flatMap(r => keys.map(k => r[k]));

      const sql = updates
        ? `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updates}`
        : `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${keys[0]} = ${keys[0]}`;

      const result = await this.execute(sql, values);
      totalAffected += result.affectedRows;
    }

    return { affectedRows: totalAffected };
  },

  /**
   * Batch insert multiple records (no update on conflict)
   */
  async batchInsert(
    table: string,
    records: Record<string, any>[],
    chunkSize: number = 1000
  ): Promise<{ affectedRows: number }> {
    if (records.length === 0) return { affectedRows: 0 };

    let totalAffected = 0;
    const keys = Object.keys(records[0]);

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      const placeholders = chunk.map(() =>
        `(${keys.map(() => '?').join(', ')})`
      ).join(', ');

      const values = chunk.flatMap(r => keys.map(k => r[k]));
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders}`;

      const result = await this.execute(sql, values);
      totalAffected += result.affectedRows;
    }

    return { affectedRows: totalAffected };
  },

  /**
   * Generate a UUID (replacement for PostgreSQL's gen_random_uuid())
   */
  generateUuid(): string {
    return uuidv4();
  },

  /**
   * Get the connection pool (for advanced use cases)
   */
  getPool() {
    return pool;
  },

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (connection: any) => Promise<T>): Promise<T> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

export default db;
