import * as Crypto from 'expo-crypto';
import { getDatabase, TABLES } from './database';

export interface HashChainEntry {
  id: string;
  prev_hash: string;
  data_hash: string;
  timestamp: string;
  block_number: number;
  merkle_root?: string;
}

export interface BribeLogEntry {
  id: string;
  service_type: string;
  office_name: string;
  amount_demanded?: number;
  location?: string;
  description?: string;
  reported_at: string;
  is_anonymous: boolean;
}

export interface TamperProofLog extends BribeLogEntry {
  hash_chain_id: string;
  prev_hash: string;
  current_hash: string;
  block_number: number;
  verification_code: string;
}

/**
 * HashChain Service for tamper-evident logging
 * Implements SHA-256 based blockchain-inspired integrity system
 */
export class HashChainService {
  private static instance: HashChainService;
  
  public static getInstance(): HashChainService {
    if (!HashChainService.instance) {
      HashChainService.instance = new HashChainService();
    }
    return HashChainService.instance;
  }

  /**
   * Initialize hash chain with genesis block
   */
  async initialize(): Promise<void> {
    const db = getDatabase();
    
    // Check if genesis block exists
    const genesisBlock = await db.getFirstAsync<HashChainEntry>(
      `SELECT * FROM ${TABLES.HASH_CHAIN} WHERE block_number = 0`
    );
    
    if (!genesisBlock) {
      console.log('🔗 Creating genesis block for hash chain...');
      await this.createGenesisBlock();
    } else {
      console.log('🔗 Hash chain already initialized');
    }
  }

  /**
   * Create the first block in the chain (genesis block)
   */
  private async createGenesisBlock(): Promise<void> {
    const db = getDatabase();
    const timestamp = new Date().toISOString();
    const genesisData = {
      message: 'CivicLens FairLine Genesis Block',
      version: '1.0',
      created_at: timestamp
    };
    
    const dataHash = await this.calculateHash(JSON.stringify(genesisData));
    const genesisHash = await this.calculateHash(`0${dataHash}${timestamp}0`);
    
    const genesisId = `genesis_${Date.now()}`;
    
    await db.runAsync(
      `INSERT INTO ${TABLES.HASH_CHAIN} (
        id, prev_hash, data_hash, timestamp, block_number, merkle_root
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [genesisId, '0', dataHash, timestamp, 0, genesisHash]
    );
    
    console.log('✅ Genesis block created:', genesisHash);
  }

  /**
   * Add a bribe log entry to the hash chain
   */
  async addBribeLog(logData: Omit<BribeLogEntry, 'id' | 'reported_at'>): Promise<TamperProofLog> {
    const db = getDatabase();
    
    // Get the last block in the chain
    const lastBlock = await db.getFirstAsync<HashChainEntry>(
      `SELECT * FROM ${TABLES.HASH_CHAIN} ORDER BY block_number DESC LIMIT 1`
    );
    
    if (!lastBlock) {
      throw new Error('Hash chain not initialized. Call initialize() first.');
    }
    
    // Create new log entry
    const logId = `bribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const blockNumber = lastBlock.block_number + 1;
    
    const bribeLog: BribeLogEntry = {
      id: logId,
      ...logData,
      reported_at: timestamp,
      is_anonymous: true // Force anonymous for security
    };
    
    // Calculate hashes
    const dataHash = await this.calculateHash(JSON.stringify(bribeLog));
    const prevHash = lastBlock.merkle_root || lastBlock.data_hash;
    const currentHash = await this.calculateHash(`${prevHash}${dataHash}${timestamp}${blockNumber}`);
    
    // Create verification code (first 8 characters of hash)
    const verificationCode = currentHash.substr(0, 8).toUpperCase();
    
    // Create hash chain entry
    const chainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      // Start transaction
      await db.runAsync('BEGIN TRANSACTION');
      
      // Insert into hash chain
      await db.runAsync(
        `INSERT INTO ${TABLES.HASH_CHAIN} (
          id, prev_hash, data_hash, timestamp, block_number, merkle_root
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [chainId, prevHash, dataHash, timestamp, blockNumber, currentHash]
      );
      
      // Insert bribe log with hash chain reference
      await db.runAsync(
        `INSERT INTO ${TABLES.BRIBE_LOGS} (
          id, service_type, office_name, amount_demanded, location, description,
          reported_at, is_anonymous, hash_chain_id, prev_hash, current_hash,
          block_number, verification_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          bribeLog.service_type,
          bribeLog.office_name,
          bribeLog.amount_demanded || null,
          bribeLog.location || null,
          bribeLog.description || null,
          bribeLog.reported_at,
          bribeLog.is_anonymous ? 1 : 0,
          chainId,
          prevHash,
          currentHash,
          blockNumber,
          verificationCode,
          timestamp
        ]
      );
      
      // Commit transaction
      await db.runAsync('COMMIT');
      
      console.log(`✅ Bribe log added to hash chain: ${verificationCode}`);
      
      const tamperProofLog: TamperProofLog = {
        ...bribeLog,
        hash_chain_id: chainId,
        prev_hash: prevHash,
        current_hash: currentHash,
        block_number: blockNumber,
        verification_code: verificationCode
      };
      
      return tamperProofLog;
      
    } catch (error) {
      await db.runAsync('ROLLBACK');
      console.error('Failed to add bribe log to hash chain:', error);
      throw error;
    }
  }

  /**
   * Verify the integrity of the entire hash chain
   */
  async verifyChainIntegrity(): Promise<{
    isValid: boolean;
    totalBlocks: number;
    corruptedBlocks: number[];
    lastVerifiedBlock: number;
  }> {
    const db = getDatabase();
    
    const blocks = await db.getAllAsync<HashChainEntry>(
      `SELECT * FROM ${TABLES.HASH_CHAIN} ORDER BY block_number ASC`
    );
    
    const corruptedBlocks: number[] = [];
    let lastVerifiedBlock = -1;
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      if (i === 0) {
        // Genesis block validation
        if (block.block_number !== 0 || block.prev_hash !== '0') {
          corruptedBlocks.push(block.block_number);
          continue;
        }
      } else {
        // Validate hash chain
        const prevBlock = blocks[i - 1];
        const expectedPrevHash = prevBlock.merkle_root || prevBlock.data_hash;
        
        if (block.prev_hash !== expectedPrevHash) {
          corruptedBlocks.push(block.block_number);
          continue;
        }
        
        // Recalculate and verify current block hash
        const expectedHash = await this.calculateHash(
          `${block.prev_hash}${block.data_hash}${block.timestamp}${block.block_number}`
        );
        
        if (block.merkle_root !== expectedHash) {
          corruptedBlocks.push(block.block_number);
          continue;
        }
      }
      
      lastVerifiedBlock = block.block_number;
    }
    
    return {
      isValid: corruptedBlocks.length === 0,
      totalBlocks: blocks.length,
      corruptedBlocks,
      lastVerifiedBlock
    };
  }

  /**
   * Verify a specific bribe log entry
   */
  async verifyBribeLog(logId: string): Promise<{
    isValid: boolean;
    log?: TamperProofLog;
    chainPosition: number;
    verificationDetails: {
      hashMatches: boolean;
      chainContinuity: boolean;
      blockNumber: number;
    };
  }> {
    const db = getDatabase();
    
    // Get the bribe log with hash chain info
    const log = await db.getFirstAsync<TamperProofLog>(
      `SELECT * FROM ${TABLES.BRIBE_LOGS} WHERE id = ?`,
      [logId]
    );
    
    if (!log) {
      return {
        isValid: false,
        chainPosition: -1,
        verificationDetails: {
          hashMatches: false,
          chainContinuity: false,
          blockNumber: -1
        }
      };
    }
    
    // Get the corresponding hash chain entry
    const chainEntry = await db.getFirstAsync<HashChainEntry>(
      `SELECT * FROM ${TABLES.HASH_CHAIN} WHERE id = ?`,
      [log.hash_chain_id]
    );
    
    if (!chainEntry) {
      return {
        isValid: false,
        log,
        chainPosition: -1,
        verificationDetails: {
          hashMatches: false,
          chainContinuity: false,
          blockNumber: log.block_number
        }
      };
    }
    
    // Verify data hash
    const logDataForHashing = {
      id: log.id,
      service_type: log.service_type,
      office_name: log.office_name,
      amount_demanded: log.amount_demanded,
      location: log.location,
      description: log.description,
      reported_at: log.reported_at,
      is_anonymous: log.is_anonymous
    };
    
    const expectedDataHash = await this.calculateHash(JSON.stringify(logDataForHashing));
    const hashMatches = chainEntry.data_hash === expectedDataHash;
    
    // Verify chain continuity
    let chainContinuity = true;
    if (chainEntry.block_number > 0) {
      const prevBlock = await db.getFirstAsync<HashChainEntry>(
        `SELECT * FROM ${TABLES.HASH_CHAIN} WHERE block_number = ?`,
        [chainEntry.block_number - 1]
      );
      
      if (prevBlock) {
        const expectedPrevHash = prevBlock.merkle_root || prevBlock.data_hash;
        chainContinuity = chainEntry.prev_hash === expectedPrevHash;
      } else {
        chainContinuity = false;
      }
    }
    
    return {
      isValid: hashMatches && chainContinuity,
      log,
      chainPosition: chainEntry.block_number,
      verificationDetails: {
        hashMatches,
        chainContinuity,
        blockNumber: chainEntry.block_number
      }
    };
  }

  /**
   * Get hash chain statistics
   */
  async getChainStats(): Promise<{
    totalBlocks: number;
    totalBribeLogs: number;
    chainStartDate: string;
    lastBlockDate: string;
    averageBlockTime: number;
    integrityStatus: 'verified' | 'corrupted' | 'unknown';
  }> {
    const db = getDatabase();
    
    const chainStats = await db.getFirstAsync<{
      totalBlocks: number;
      firstTimestamp: string;
      lastTimestamp: string;
    }>(`
      SELECT 
        COUNT(*) as totalBlocks,
        MIN(timestamp) as firstTimestamp,
        MAX(timestamp) as lastTimestamp
      FROM ${TABLES.HASH_CHAIN}
    `);
    
    const bribeLogCount = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.BRIBE_LOGS}`
    );
    
    let averageBlockTime = 0;
    if (chainStats && chainStats.totalBlocks > 1) {
      const firstTime = new Date(chainStats.firstTimestamp).getTime();
      const lastTime = new Date(chainStats.lastTimestamp).getTime();
      averageBlockTime = (lastTime - firstTime) / (chainStats.totalBlocks - 1);
    }
    
    // Quick integrity check (sample verification)
    const verification = await this.verifyChainIntegrity();
    
    return {
      totalBlocks: chainStats?.totalBlocks || 0,
      totalBribeLogs: bribeLogCount?.count || 0,
      chainStartDate: chainStats?.firstTimestamp || '',
      lastBlockDate: chainStats?.lastTimestamp || '',
      averageBlockTime: Math.round(averageBlockTime / 1000), // Convert to seconds
      integrityStatus: verification.isValid ? 'verified' : 'corrupted'
    };
  }

  /**
   * Export chain for audit purposes
   */
  async exportChainAudit(): Promise<{
    metadata: {
      exportDate: string;
      totalBlocks: number;
      integrityStatus: string;
    };
    blocks: Array<{
      blockNumber: number;
      hash: string;
      timestamp: string;
      dataHash: string;
      prevHash: string;
    }>;
    bribeLogs: Array<{
      id: string;
      blockNumber: number;
      verificationCode: string;
      serviceType: string;
      reportedAt: string;
      isAnonymous: boolean;
    }>;
  }> {
    const db = getDatabase();
    
    const blocks = await db.getAllAsync<HashChainEntry>(
      `SELECT * FROM ${TABLES.HASH_CHAIN} ORDER BY block_number ASC`
    );
    
    const logs = await db.getAllAsync<{
      id: string;
      block_number: number;
      verification_code: string;
      service_type: string;
      reported_at: string;
      is_anonymous: number;
    }>(`
      SELECT 
        id, block_number, verification_code, service_type, 
        reported_at, is_anonymous
      FROM ${TABLES.BRIBE_LOGS}
      ORDER BY block_number ASC
    `);
    
    const integrity = await this.verifyChainIntegrity();
    
    return {
      metadata: {
        exportDate: new Date().toISOString(),
        totalBlocks: blocks.length,
        integrityStatus: integrity.isValid ? 'VERIFIED' : 'CORRUPTED'
      },
      blocks: blocks.map(block => ({
        blockNumber: block.block_number,
        hash: block.merkle_root || block.data_hash,
        timestamp: block.timestamp,
        dataHash: block.data_hash,
        prevHash: block.prev_hash
      })),
      bribeLogs: logs.map(log => ({
        id: log.id,
        blockNumber: log.block_number,
        verificationCode: log.verification_code,
        serviceType: log.service_type,
        reportedAt: log.reported_at,
        isAnonymous: log.is_anonymous === 1
      }))
    };
  }

  /**
   * Calculate SHA-256 hash of input data
   */
  private async calculateHash(data: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  /**
   * Generate a unique verification code for public verification
   */
  generateVerificationCode(hash: string): string {
    return hash.substr(0, 8).toUpperCase();
  }

  /**
   * Verify a verification code against stored logs
   */
  async verifyPublicCode(verificationCode: string): Promise<{
    isValid: boolean;
    logFound: boolean;
    blockNumber?: number;
    reportedAt?: string;
    serviceType?: string;
  }> {
    const db = getDatabase();
    
    const log = await db.getFirstAsync<{
      block_number: number;
      reported_at: string;
      service_type: string;
    }>(`
      SELECT block_number, reported_at, service_type
      FROM ${TABLES.BRIBE_LOGS}
      WHERE verification_code = ?
    `, [verificationCode]);
    
    if (!log) {
      return { isValid: false, logFound: false };
    }
    
    // Verify the log hasn't been tampered with
    const verification = await this.verifyBribeLog(
      (await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM ${TABLES.BRIBE_LOGS} WHERE verification_code = ?`,
        [verificationCode]
      ))?.id || ''
    );
    
    return {
      isValid: verification.isValid,
      logFound: true,
      blockNumber: log.block_number,
      reportedAt: log.reported_at,
      serviceType: log.service_type
    };
  }
}