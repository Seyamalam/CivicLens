import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase } from '@/contexts/database-context';
import { HashChainService } from '@/lib/hash-chain';

interface VerificationResult {
  isValid: boolean;
  logFound: boolean;
  blockNumber?: number;
  reportedAt?: string;
  serviceType?: string;
}

interface ChainStats {
  totalBlocks: number;
  totalBribeLogs: number;
  chainStartDate: string;
  lastBlockDate: string;
  averageBlockTime: number;
  integrityStatus: 'verified' | 'corrupted' | 'unknown';
}

export default function HashChainVerificationScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [chainStats, setChainStats] = useState<ChainStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadChainStats();
    }
  }, [isInitialized]);

  const loadChainStats = async () => {
    try {
      setIsLoadingStats(true);
      const hashChainService = HashChainService.getInstance();
      await hashChainService.initialize();
      
      const stats = await hashChainService.getChainStats();
      setChainStats(stats);
    } catch (error) {
      console.error('Failed to load chain stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter a verification code');
      return;
    }

    try {
      setIsVerifying(true);
      const hashChainService = HashChainService.getInstance();
      
      const result = await hashChainService.verifyPublicCode(verificationCode.toUpperCase());
      setVerificationResult(result);
      
      if (result.logFound && result.isValid) {
        Alert.alert(
          'Verification Successful ✅',
          `This verification code is valid and corresponds to a tamper-proof bribe log recorded on ${new Date(result.reportedAt || '').toLocaleDateString()}.`,
          [{ text: 'OK' }]
        );
      } else if (result.logFound && !result.isValid) {
        Alert.alert(
          'Verification Failed ❌',
          'This verification code was found but the associated log has been tampered with or corrupted.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Code Not Found ❓',
          'This verification code was not found in our tamper-proof database.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyChainIntegrity = async () => {
    try {
      setIsVerifyingChain(true);
      const hashChainService = HashChainService.getInstance();
      
      const integrity = await hashChainService.verifyChainIntegrity();
      
      if (integrity.isValid) {
        Alert.alert(
          'Chain Integrity Verified ✅',
          `All ${integrity.totalBlocks} blocks in the hash chain are valid and have not been tampered with.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Chain Integrity Compromised ❌',
          `${integrity.corruptedBlocks.length} out of ${integrity.totalBlocks} blocks have been corrupted or tampered with.`,
          [{ text: 'OK' }]
        );
      }
      
      // Refresh stats after verification
      await loadChainStats();
    } catch (error) {
      console.error('Chain verification error:', error);
      Alert.alert('Error', 'Failed to verify chain integrity.');
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#0891b2" />
        <Text className="text-gray-600 dark:text-gray-400 mt-2">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Hash Chain Verification
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Verify tamper-proof evidence integrity
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Verification Code Input */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
        >
          <Text className="font-bold text-gray-900 dark:text-white mb-3">
            Verify Report Code
          </Text>
          
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter the 8-character verification code from your bribe log submission to verify its integrity.
          </Text>
          
          <View className="space-y-4">
            <TextInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Enter verification code (e.g., A1B2C3D4)"
              placeholderTextColor="#9ca3af"
              className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-lg tracking-wider"
              autoCapitalize="characters"
              maxLength={8}
            />
            
            <TouchableOpacity
              onPress={verifyCode}
              className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-3 items-center"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-bold ml-2">Verifying...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold">Verify Code</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Verification Result */}
          {verificationResult && (
            <View className="mt-4 p-3 rounded-lg" style={{
              backgroundColor: verificationResult.isValid && verificationResult.logFound 
                ? '#dcfce7' 
                : verificationResult.logFound 
                ? '#fef3c7' 
                : '#fee2e2'
            }}>
              <View className="flex-row items-center">
                <Ionicons 
                  name={
                    verificationResult.isValid && verificationResult.logFound 
                      ? "checkmark-circle" 
                      : verificationResult.logFound 
                      ? "warning" 
                      : "close-circle"
                  } 
                  size={20} 
                  color={
                    verificationResult.isValid && verificationResult.logFound 
                      ? '#16a34a' 
                      : verificationResult.logFound 
                      ? '#d97706' 
                      : '#dc2626'
                  } 
                />
                <Text className="ml-2 font-bold" style={{
                  color: verificationResult.isValid && verificationResult.logFound 
                    ? '#16a34a' 
                    : verificationResult.logFound 
                    ? '#d97706' 
                    : '#dc2626'
                }}>
                  {verificationResult.isValid && verificationResult.logFound 
                    ? "Valid & Verified" 
                    : verificationResult.logFound 
                    ? "Found but Corrupted" 
                    : "Code Not Found"}
                </Text>
              </View>
              
              {verificationResult.logFound && (
                <View className="mt-2">
                  <Text className="text-sm text-gray-700">
                    Block: #{verificationResult.blockNumber}
                  </Text>
                  <Text className="text-sm text-gray-700">
                    Service: {verificationResult.serviceType}
                  </Text>
                  <Text className="text-sm text-gray-700">
                    Date: {formatDate(verificationResult.reportedAt || '')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </MotiView>

        {/* Chain Statistics */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
        >
          <Text className="font-bold text-gray-900 dark:text-white mb-3">
            Hash Chain Statistics
          </Text>
          
          {isLoadingStats ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#0891b2" />
              <Text className="text-gray-500 dark:text-gray-400 mt-2">Loading stats...</Text>
            </View>
          ) : chainStats ? (
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Total Blocks</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {chainStats.totalBlocks}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Bribe Logs</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {chainStats.totalBribeLogs}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Chain Started</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatDate(chainStats.chainStartDate)}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Last Activity</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatDate(chainStats.lastBlockDate)}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Avg Block Time</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatTime(chainStats.averageBlockTime)}
                </Text>
              </View>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 dark:text-gray-400">Integrity Status</Text>
                <View className="flex-row items-center">
                  <Ionicons 
                    name={chainStats.integrityStatus === 'verified' ? 'shield-checkmark' : 'warning'} 
                    size={16} 
                    color={chainStats.integrityStatus === 'verified' ? '#16a34a' : '#f59e0b'} 
                  />
                  <Text 
                    className="ml-1 font-medium"
                    style={{ 
                      color: chainStats.integrityStatus === 'verified' ? '#16a34a' : '#f59e0b' 
                    }}
                  >
                    {chainStats.integrityStatus === 'verified' ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
              Failed to load statistics
            </Text>
          )}
        </MotiView>

        {/* Chain Integrity Verification */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 400 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
        >
          <Text className="font-bold text-gray-900 dark:text-white mb-3">
            Full Chain Verification
          </Text>
          
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Verify the integrity of the entire hash chain to ensure no tampering has occurred.
          </Text>
          
          <TouchableOpacity
            onPress={verifyChainIntegrity}
            className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-3 items-center"
            disabled={isVerifyingChain}
          >
            {isVerifyingChain ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-bold ml-2">Verifying Chain...</Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={20} color="white" />
                <Text className="text-white font-bold ml-2">Verify Full Chain</Text>
              </View>
            )}
          </TouchableOpacity>
        </MotiView>

        {/* How It Works */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 600 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4"
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text className="ml-2 font-bold text-blue-800 dark:text-blue-200">
              How Hash Chain Verification Works
            </Text>
          </View>
          
          <Text className="text-blue-700 dark:text-blue-300 text-sm leading-6">
            Each bribe log is cryptographically linked to the previous one using SHA-256 hashing, creating an immutable chain. Any attempt to modify existing records would break the chain and be detectable during verification.
          </Text>
          
          <View className="mt-3 space-y-2">
            <Text className="text-blue-600 dark:text-blue-400 text-xs">
              • Each log gets a unique verification code
            </Text>
            <Text className="text-blue-600 dark:text-blue-400 text-xs">
              • Logs are cryptographically linked in sequence
            </Text>
            <Text className="text-blue-600 dark:text-blue-400 text-xs">
              • Tampering attempts are automatically detected
            </Text>
            <Text className="text-blue-600 dark:text-blue-400 text-xs">
              • Full chain integrity can be verified at any time
            </Text>
          </View>
        </MotiView>
      </ScrollView>
    </View>
  );
}