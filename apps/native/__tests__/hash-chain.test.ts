/**
 * Test Suite for FairLine Module - Hash Chain Service
 * Tests the tamper-evident logging system for bribe reports
 */

import { HashChainService, BribeLog, ChainBlock } from '../lib/hash-chain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('FairLine - Hash Chain Service', () => {
  const mockBribeLog: BribeLog = {
    id: 'log_001',
    timestamp: new Date('2024-02-15T10:30:00Z'),
    service: 'passport_renewal',
    office: 'Passport Office Dhaka',
    amount: 500,
    description: 'Asked for extra fee for faster processing',
    location: {
      latitude: 23.8103,
      longitude: 90.4125,
      accuracy: 5
    },
    anonymous: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('Initialization', () => {
    it('should initialize genesis block correctly', async () => {
      const genesis = await HashChainService.initializeChain();

      expect(genesis).toBeDefined();
      expect(genesis.index).toBe(0);
      expect(genesis.previousHash).toBe('0');
      expect(genesis.hash).toBeTruthy();
      expect(genesis.data).toEqual({
        type: 'genesis',
        message: 'FairLine Genesis Block - Tamper-Evident Bribe Logging',
        timestamp: expect.any(String)
      });
    });

    it('should load existing chain from storage', async () => {
      const existingBlock: ChainBlock = {
        index: 0,
        timestamp: new Date().toISOString(),
        data: { type: 'genesis', message: 'test', timestamp: new Date().toISOString() },
        previousHash: '0',
        hash: 'test-hash'
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([existingBlock]));

      const chain = await HashChainService.getChain();

      expect(chain).toHaveLength(1);
      expect(chain[0]).toEqual(existingBlock);
    });
  });

  describe('Hash Generation', () => {
    it('should generate consistent hashes for same input', () => {
      const testData = { test: 'data', timestamp: '2024-02-15T10:30:00Z' };
      
      const hash1 = HashChainService.calculateHash(1, testData, 'previous-hash', '2024-02-15T10:30:00Z');
      const hash2 = HashChainService.calculateHash(1, testData, 'previous-hash', '2024-02-15T10:30:00Z');

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hashes for different inputs', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };
      
      const hash1 = HashChainService.calculateHash(1, data1, 'previous', '2024-02-15T10:30:00Z');
      const hash2 = HashChainService.calculateHash(1, data2, 'previous', '2024-02-15T10:30:00Z');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different indices', () => {
      const data = { test: 'data' };
      
      const hash1 = HashChainService.calculateHash(1, data, 'previous', '2024-02-15T10:30:00Z');
      const hash2 = HashChainService.calculateHash(2, data, 'previous', '2024-02-15T10:30:00Z');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Adding Bribe Logs', () => {
    it('should add bribe log to empty chain', async () => {
      // Mock empty storage
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await HashChainService.addBribeLog(mockBribeLog);

      expect(result.success).toBe(true);
      expect(result.blockIndex).toBe(1); // Genesis is 0, first log is 1
      expect(result.hash).toBeTruthy();
      
      // Verify storage was called
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should add bribe log to existing chain', async () => {
      const existingChain = [
        {
          index: 0,
          timestamp: new Date().toISOString(),
          data: { type: 'genesis', message: 'test', timestamp: new Date().toISOString() },
          previousHash: '0',
          hash: 'genesis-hash'
        }
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingChain));

      const result = await HashChainService.addBribeLog(mockBribeLog);

      expect(result.success).toBe(true);
      expect(result.blockIndex).toBe(1);
      expect(result.previousHash).toBe('genesis-hash');
    });

    it('should maintain chain integrity when adding multiple logs', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const log1 = { ...mockBribeLog, id: 'log_001' };
      const log2 = { ...mockBribeLog, id: 'log_002', service: 'license_renewal' };

      const result1 = await HashChainService.addBribeLog(log1);
      const result2 = await HashChainService.addBribeLog(log2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.blockIndex).toBe(result1.blockIndex + 1);
      expect(result2.previousHash).toBe(result1.hash);
    });
  });

  describe('Chain Verification', () => {
    it('should verify valid chain integrity', async () => {
      // Create a valid chain
      const genesis: ChainBlock = {
        index: 0,
        timestamp: new Date().toISOString(),
        data: { type: 'genesis', message: 'test', timestamp: new Date().toISOString() },
        previousHash: '0',
        hash: HashChainService.calculateHash(0, { type: 'genesis', message: 'test', timestamp: new Date().toISOString() }, '0', new Date().toISOString())
      };

      const block1: ChainBlock = {
        index: 1,
        timestamp: new Date().toISOString(),
        data: mockBribeLog,
        previousHash: genesis.hash,
        hash: ''
      };
      block1.hash = HashChainService.calculateHash(1, mockBribeLog, genesis.hash, block1.timestamp);

      const chain = [genesis, block1];
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(chain));

      const isValid = await HashChainService.verifyChainIntegrity();

      expect(isValid).toBe(true);
    });

    it('should detect tampered blocks', async () => {
      // Create a chain with tampered data
      const genesis: ChainBlock = {
        index: 0,
        timestamp: new Date().toISOString(),
        data: { type: 'genesis', message: 'test', timestamp: new Date().toISOString() },
        previousHash: '0',
        hash: 'valid-genesis-hash'
      };

      const tamperedBlock: ChainBlock = {
        index: 1,
        timestamp: new Date().toISOString(),
        data: { ...mockBribeLog, amount: 1000 }, // Tampered amount
        previousHash: genesis.hash,
        hash: HashChainService.calculateHash(1, mockBribeLog, genesis.hash, new Date().toISOString()) // Hash doesn't match data
      };

      const chain = [genesis, tamperedBlock];
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(chain));

      const isValid = await HashChainService.verifyChainIntegrity();

      expect(isValid).toBe(false);
    });

    it('should detect broken chain links', async () => {
      const genesis: ChainBlock = {
        index: 0,
        timestamp: new Date().toISOString(),
        data: { type: 'genesis', message: 'test', timestamp: new Date().toISOString() },
        previousHash: '0',
        hash: 'genesis-hash'
      };

      const block1: ChainBlock = {
        index: 1,
        timestamp: new Date().toISOString(),
        data: mockBribeLog,
        previousHash: 'wrong-previous-hash', // Broken link
        hash: 'block1-hash'
      };

      const chain = [genesis, block1];
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(chain));

      const isValid = await HashChainService.verifyChainIntegrity();

      expect(isValid).toBe(false);
    });
  });

  describe('Export Functionality', () => {
    it('should export chain with integrity proof', async () => {
      const mockChain = [
        {
          index: 0,
          timestamp: new Date().toISOString(),
          data: { type: 'genesis', message: 'test', timestamp: new Date().toISOString() },
          previousHash: '0',
          hash: 'genesis-hash'
        },
        {
          index: 1,
          timestamp: new Date().toISOString(),
          data: mockBribeLog,
          previousHash: 'genesis-hash',
          hash: 'block1-hash'
        }
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockChain));

      const exportData = await HashChainService.exportChainData();

      expect(exportData).toBeDefined();
      expect(exportData.metadata).toBeDefined();
      expect(exportData.metadata.totalBlocks).toBe(2);
      expect(exportData.metadata.isValid).toBeDefined();
      expect(exportData.chain).toEqual(mockChain);
      expect(exportData.integrityProof).toBeDefined();
    });

    it('should include statistics in export', async () => {
      const mockChain = [
        {
          index: 0,
          timestamp: new Date().toISOString(),
          data: { type: 'genesis', message: 'test', timestamp: new Date().toISOString() },
          previousHash: '0',
          hash: 'genesis-hash'
        },
        {
          index: 1,
          timestamp: new Date().toISOString(),
          data: mockBribeLog,
          previousHash: 'genesis-hash',
          hash: 'block1-hash'
        }
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockChain));

      const exportData = await HashChainService.exportChainData();

      expect(exportData.statistics).toBeDefined();
      expect(exportData.statistics.totalLogs).toBe(1); // Excluding genesis
      expect(exportData.statistics.services).toBeDefined();
      expect(exportData.statistics.offices).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await HashChainService.addBribeLog(mockBribeLog);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid bribe log data', async () => {
      const invalidLog = {
        ...mockBribeLog,
        timestamp: null as any
      };

      const result = await HashChainService.addBribeLog(invalidLog);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid bribe log data');
    });

    it('should handle corrupted chain data', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-json');

      const isValid = await HashChainService.verifyChainIntegrity();

      expect(isValid).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large chains efficiently', async () => {
      // Create a large chain (1000 blocks)
      const largeChain = Array.from({ length: 1000 }, (_, index) => ({
        index,
        timestamp: new Date().toISOString(),
        data: index === 0 ? { type: 'genesis', message: 'test', timestamp: new Date().toISOString() } : mockBribeLog,
        previousHash: index === 0 ? '0' : `hash-${index - 1}`,
        hash: `hash-${index}`
      }));

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(largeChain));

      const startTime = Date.now();
      await HashChainService.verifyChainIntegrity();
      const endTime = Date.now();

      // Should verify large chain within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});