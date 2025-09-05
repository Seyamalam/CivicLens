import * as SQLite from 'expo-sqlite';

// Database name and version
export const DATABASE_NAME = 'civiclens.db';
export const DATABASE_VERSION = 1;

// Table names
export const TABLES = {
  TENDERS: 'tenders',
  SUPPLIERS: 'suppliers',
  SERVICES: 'services',
  OVERCHARGE_REPORTS: 'overcharge_reports',
  RTI_REQUESTS: 'rti_requests',
  BRIBE_LOGS: 'bribe_logs',
  HASH_CHAIN: 'hash_chain',
  PERMIT_APPS: 'permit_apps',
  PERMIT_APPLICATIONS: 'permit_apps', // Alias for DelayDetectionService
  PROJECTS: 'projects',
  SYNC_QUEUE: 'sync_queue',
  USER_SETTINGS: 'user_settings',
} as const;

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the SQLite database
 */
export const initializeDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    
    // Enable foreign key constraints
    await db.execAsync('PRAGMA foreign_keys = ON;');
    
    // Create tables
    await createTables();
    
    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

/**
 * Get the database instance
 */
export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

/**
 * Create all database tables
 */
const createTables = async (): Promise<void> => {
  const database = getDatabase();

  // Tenders table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.TENDERS} (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_bn TEXT NOT NULL,
      organization_en TEXT NOT NULL,
      organization_bn TEXT NOT NULL,
      amount REAL NOT NULL,
      deadline TEXT NOT NULL,
      risk_score INTEGER DEFAULT 0,
      risk_flags TEXT DEFAULT '[]',
      submission_start TEXT NOT NULL,
      submission_end TEXT NOT NULL,
      estimated_value REAL,
      tender_type TEXT NOT NULL,
      procurement_method TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    );
  `);

  // Suppliers table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.SUPPLIERS} (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      registration_number TEXT UNIQUE NOT NULL,
      contact_email TEXT,
      contact_phone TEXT,
      address_en TEXT,
      address_bn TEXT,
      established_year INTEGER,
      business_type TEXT NOT NULL,
      win_rate REAL DEFAULT 0.0,
      avg_bid_amount REAL DEFAULT 0.0,
      total_contracts INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    );
  `);

  // Services table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.SERVICES} (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      category TEXT NOT NULL,
      office_name_en TEXT NOT NULL,
      office_name_bn TEXT NOT NULL,
      official_fee REAL NOT NULL,
      official_timeline_days INTEGER NOT NULL,
      description_en TEXT,
      description_bn TEXT,
      requirements_en TEXT,
      requirements_bn TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    );
  `);

  // Overcharge Reports table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.OVERCHARGE_REPORTS} (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      official_fee REAL NOT NULL,
      paid_fee REAL NOT NULL,
      overcharge_amount REAL NOT NULL,
      office_name_en TEXT NOT NULL,
      office_name_bn TEXT NOT NULL,
      district TEXT NOT NULL,
      upazila TEXT,
      description_en TEXT,
      description_bn TEXT,
      reported_at TEXT DEFAULT CURRENT_TIMESTAMP,
      geo_location TEXT,
      is_anonymous BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0,
      FOREIGN KEY (service_id) REFERENCES ${TABLES.SERVICES}(id)
    );
  `);

  // RTI Requests table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.RTI_REQUESTS} (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_bn TEXT NOT NULL,
      request_text_en TEXT NOT NULL,
      request_text_bn TEXT NOT NULL,
      agency_name_en TEXT NOT NULL,
      agency_name_bn TEXT NOT NULL,
      submitted_date TEXT NOT NULL,
      deadline_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      response_text TEXT,
      outcome TEXT,
      is_published BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    );
  `);

  // Bribe Logs table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.BRIBE_LOGS} (
      id TEXT PRIMARY KEY,
      service_type TEXT NOT NULL,
      office_name TEXT NOT NULL,
      amount_demanded REAL,
      location TEXT,
      description TEXT,
      reported_at TEXT NOT NULL,
      is_anonymous BOOLEAN DEFAULT 1,
      hash_chain_id TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      current_hash TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      verification_code TEXT NOT NULL,
      geo_location TEXT,
      audio_file_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0,
      FOREIGN KEY (hash_chain_id) REFERENCES ${TABLES.HASH_CHAIN}(id)
    );
  `);

  // Hash Chain table for tamper evidence
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.HASH_CHAIN} (
      id TEXT PRIMARY KEY,
      prev_hash TEXT NOT NULL,
      data_hash TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      block_number INTEGER NOT NULL UNIQUE,
      merkle_root TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Permit Applications table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.PERMIT_APPS} (
      id TEXT PRIMARY KEY,
      permit_type TEXT NOT NULL,
      application_number TEXT,
      office_name TEXT NOT NULL,
      submitted_date TEXT NOT NULL,
      expected_completion TEXT NOT NULL,
      actual_completion TEXT,
      current_stage TEXT NOT NULL DEFAULT 'submitted',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'delayed', 'rejected')),
      expected_days INTEGER NOT NULL,
      actual_days INTEGER,
      delay_reason TEXT,
      contact_person TEXT,
      phone_number TEXT,
      email TEXT,
      office_address TEXT,
      documents_required TEXT DEFAULT '[]',
      documents_submitted TEXT DEFAULT '[]',
      fees_paid REAL DEFAULT 0,
      total_fees REAL DEFAULT 0,
      notes TEXT,
      geo_location TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    );
  `);

  // Projects table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.PROJECTS} (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_bn TEXT NOT NULL,
      description_en TEXT,
      description_bn TEXT,
      budget REAL NOT NULL,
      spent_amount REAL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT,
      current_status TEXT NOT NULL,
      district TEXT NOT NULL,
      upazila TEXT,
      ward TEXT,
      contractor_name TEXT,
      geo_location TEXT,
      verification_photos TEXT DEFAULT '[]',
      unit_cost_analysis TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0
    );
  `);

  // Sync Queue table for managing offline data synchronization
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.SYNC_QUEUE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER DEFAULT 0,
      last_attempt TEXT,
      error_message TEXT
    );
  `);

  // User Settings table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLES.USER_SETTINGS} (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      language TEXT DEFAULT 'en' CHECK (language IN ('en', 'bn')),
      theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
      notifications_enabled BOOLEAN DEFAULT 1,
      sync_enabled BOOLEAN DEFAULT 1,
      last_sync_timestamp TEXT,
      user_id TEXT,
      is_anonymous BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default user settings
  await database.execAsync(`
    INSERT OR IGNORE INTO ${TABLES.USER_SETTINGS} (id, language, theme, notifications_enabled, sync_enabled, is_anonymous)
    VALUES (1, 'en', 'system', 1, 1, 1);
  `);

  console.log('✅ All database tables created successfully');
};

/**
 * Clear all data from tables (for development/testing)
 */
export const clearAllTables = async (): Promise<void> => {
  const database = getDatabase();
  
  const tableNames = Object.values(TABLES);
  
  for (const tableName of tableNames) {
    await database.execAsync(`DELETE FROM ${tableName};`);
  }
  
  console.log('✅ All tables cleared');
};

/**
 * Drop all tables (for development/testing)
 */
export const dropAllTables = async (): Promise<void> => {
  const database = getDatabase();
  
  const tableNames = Object.values(TABLES);
  
  for (const tableName of tableNames) {
    await database.execAsync(`DROP TABLE IF EXISTS ${tableName};`);
  }
  
  console.log('✅ All tables dropped');
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  const database = getDatabase();
  
  const stats: Record<string, number> = {};
  
  for (const [key, tableName] of Object.entries(TABLES)) {
    try {
      const result = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );
      stats[key] = result?.count ?? 0;
    } catch (error) {
      console.warn(`Failed to get count for table ${tableName}:`, error);
      stats[key] = 0;
    }
  }
  
  return stats;
};