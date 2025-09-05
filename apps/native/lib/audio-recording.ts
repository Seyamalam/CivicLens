import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface AudioRecording {
  id: string;
  uri: string;
  duration: number; // in milliseconds
  size: number; // file size in bytes
  recordedAt: string;
  isCompressed: boolean;
}

export interface RecordingPermissions {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

/**
 * Audio Recording Service for FairLine evidence collection
 * Handles secure voice memo recording for bribe solicitation reports
 */
export class AudioRecordingService {
  private static instance: AudioRecordingService;
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  
  public static getInstance(): AudioRecordingService {
    if (!AudioRecordingService.instance) {
      AudioRecordingService.instance = new AudioRecordingService();
    }
    return AudioRecordingService.instance;
  }

  /**
   * Request audio recording permissions
   */
  async requestPermissions(): Promise<RecordingPermissions> {
    try {
      const { status, canAskAgain, granted } = await Audio.requestPermissionsAsync();
      
      console.log('🎤 Audio permission status:', status);
      
      return {
        granted,
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'error'
      };
    }
  }

  /**
   * Configure audio session for recording
   */
  private async configureAudioSession(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Failed to configure audio session:', error);
      throw new Error('Audio configuration failed');
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<boolean> {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return false;
    }

    try {
      // Request permissions
      const permissions = await this.requestPermissions();
      if (!permissions.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant microphone permission to record voice memos for evidence.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Configure audio session
      await this.configureAudioSession();

      // Create new recording instance
      this.recording = new Audio.Recording();
      
      // Configure recording options for evidence quality
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      console.log('🎤 Recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.cleanup();
      throw new Error('Failed to start audio recording');
    }
  }

  /**
   * Stop recording and return audio file info
   */
  async stopRecording(): Promise<AudioRecording | null> {
    if (!this.isRecording || !this.recording) {
      console.warn('No recording in progress');
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        throw new Error('Recording URI not available');
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const duration = Date.now() - this.recordingStartTime;
      
      const audioRecording: AudioRecording = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uri,
        duration,
        size: fileInfo.size || 0,
        recordedAt: new Date().toISOString(),
        isCompressed: true
      };

      console.log('🎤 Recording stopped:', {
        duration: `${(duration / 1000).toFixed(1)}s`,
        size: `${(audioRecording.size / 1024).toFixed(1)}KB`
      });

      this.cleanup();
      return audioRecording;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.cleanup();
      throw new Error('Failed to stop audio recording');
    }
  }

  /**
   * Cancel current recording
   */
  async cancelRecording(): Promise<void> {
    if (!this.isRecording || !this.recording) {
      return;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      // Delete the recording file
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('🎤 Recording cancelled and deleted');
      }
    } catch (error) {
      console.error('Error cancelling recording:', error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): {
    isRecording: boolean;
    duration: number;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0
    };
  }

  /**
   * Play back an audio recording
   */
  async playRecording(uri: string): Promise<Audio.Sound | null> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      console.log('🎵 Playing recording');
      return sound;
    } catch (error) {
      console.error('Failed to play recording:', error);
      return null;
    }
  }

  /**
   * Copy recording to secure evidence directory
   */
  async secureRecording(recording: AudioRecording, reportId: string): Promise<string> {
    try {
      // Create evidence directory if it doesn't exist
      const evidenceDir = `${FileSystem.documentDirectory}evidence/`;
      const dirInfo = await FileSystem.getInfoAsync(evidenceDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(evidenceDir, { intermediates: true });
      }

      // Create secure filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const secureFilename = `${reportId}_audio_${timestamp}.m4a`;
      const securePath = `${evidenceDir}${secureFilename}`;

      // Copy file to secure location
      await FileSystem.copyAsync({
        from: recording.uri,
        to: securePath
      });

      // Delete original temporary file
      await FileSystem.deleteAsync(recording.uri, { idempotent: true });

      console.log('🔒 Recording secured:', securePath);
      return securePath;
    } catch (error) {
      console.error('Failed to secure recording:', error);
      throw new Error('Failed to secure audio evidence');
    }
  }

  /**
   * Get audio file metadata
   */
  async getAudioMetadata(uri: string): Promise<{
    duration: number;
    size: number;
    format: string;
    lastModified: number;
  } | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return null;
      }

      // For more detailed metadata, we'd need additional libraries
      // This provides basic information available through FileSystem
      return {
        duration: 0, // Would need audio analysis for accurate duration
        size: fileInfo.size || 0,
        format: uri.split('.').pop() || 'unknown',
        lastModified: fileInfo.modificationTime || 0
      };
    } catch (error) {
      console.error('Failed to get audio metadata:', error);
      return null;
    }
  }

  /**
   * Compress audio recording for storage optimization
   */
  async compressRecording(recording: AudioRecording): Promise<AudioRecording> {
    // For now, return the original recording
    // In production, you might want to implement audio compression
    // using libraries like react-native-audio-toolkit or ffmpeg
    console.log('📦 Audio compression not implemented yet');
    return { ...recording, isCompressed: false };
  }

  /**
   * Validate audio recording for evidence requirements
   */
  validateRecording(recording: AudioRecording): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check minimum duration (e.g., 1 second)
    if (recording.duration < 1000) {
      issues.push('Recording too short (minimum 1 second)');
    }

    // Check maximum duration (e.g., 10 minutes for storage efficiency)
    if (recording.duration > 600000) {
      issues.push('Recording too long (maximum 10 minutes)');
    }

    // Check file size (e.g., maximum 50MB)
    if (recording.size > 50 * 1024 * 1024) {
      issues.push('File size too large (maximum 50MB)');
    }

    // Check if file exists
    if (!recording.uri) {
      issues.push('Recording file not found');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Clean up recording resources
   */
  private cleanup(): void {
    this.recording = null;
    this.isRecording = false;
    this.recordingStartTime = 0;
  }

  /**
   * Delete audio recording file
   */
  async deleteRecording(uri: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      console.log('🗑️ Recording deleted:', uri);
      return true;
    } catch (error) {
      console.error('Failed to delete recording:', error);
      return false;
    }
  }

  /**
   * Get storage statistics for audio files
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    evidenceDir: string;
  }> {
    try {
      const evidenceDir = `${FileSystem.documentDirectory}evidence/`;
      const dirInfo = await FileSystem.getInfoAsync(evidenceDir);
      
      if (!dirInfo.exists) {
        return {
          totalFiles: 0,
          totalSize: 0,
          evidenceDir
        };
      }

      const files = await FileSystem.readDirectoryAsync(evidenceDir);
      let totalSize = 0;
      let audioFiles = 0;

      for (const file of files) {
        if (file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.wav')) {
          const filePath = `${evidenceDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          totalSize += fileInfo.size || 0;
          audioFiles++;
        }
      }

      return {
        totalFiles: audioFiles,
        totalSize,
        evidenceDir
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        evidenceDir: ''
      };
    }
  }
}