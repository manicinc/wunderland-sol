// frontend/src/utils/CostOptimizer.ts - Whisper API Cost Optimization Service

interface OptimizationOptions {
  enableCompression?: boolean;
  enableSilenceDetection?: boolean;
  enableDuplicateDetection?: boolean;
  maxDuration?: number;
  silenceThreshold?: number;
  minSilenceDurationMs?: number;
}

interface AudioProcessingResult {
  optimizedBlob: Blob;
  originalSize: number;
  optimizedSize: number;
  estimatedCost: number;
  processingTime: number;
  optimizations: string[];
  duration: number;
  isSilent: boolean;
}

interface CostCalculation {
  durationMinutes: number;
  estimatedCost: number;
  costPerMinute: number;
  billableMinutes: number; // Whisper has minimum billing
}

interface AudioMetadata {
  duration: number;
  fileSize: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
}

export class CostOptimizer {
  private static readonly WHISPER_COST_PER_MINUTE = 0.006; // $0.006 per minute as of 2025
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit
  private static readonly MIN_BILLING_DURATION = 0.01; // 0.01 minutes minimum billing
  private static readonly MIN_AUDIO_DURATION = 0.1; // 100ms minimum for meaningful audio
  
  private options: Required<OptimizationOptions>;

  constructor(options: OptimizationOptions = {}) {
    this.options = {
      enableCompression: options.enableCompression ?? false, // Disabled by default (complex to implement)
      enableSilenceDetection: options.enableSilenceDetection ?? true,
      enableDuplicateDetection: options.enableDuplicateDetection ?? false,
      maxDuration: options.maxDuration ?? 300, // 5 minutes max
      silenceThreshold: options.silenceThreshold ?? 0.01,
      minSilenceDurationMs: options.minSilenceDurationMs ?? 500
    };
  }

  /**
   * Calculate cost based on audio duration
   */
  static calculateCost(durationSeconds: number): CostCalculation {
    const durationMinutes = durationSeconds / 60;
    // Whisper bills minimum 0.01 minutes (0.6 seconds)
    const billableMinutes = Math.max(durationMinutes, this.MIN_BILLING_DURATION);
    const estimatedCost = billableMinutes * this.WHISPER_COST_PER_MINUTE;
    
    return {
      durationMinutes,
      billableMinutes,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimal places
      costPerMinute: this.WHISPER_COST_PER_MINUTE
    };
  }

  /**
   * Get audio duration from blob using HTML5 Audio API
   */
  static async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('loadedmetadata', onLoad);
        audio.removeEventListener('error', onError);
      };
      
      const onLoad = () => {
        cleanup();
        resolve(audio.duration || 0);
      };
      
      const onError = () => {
        cleanup();
        reject(new Error('Failed to load audio metadata'));
      };
      
      audio.addEventListener('loadedmetadata', onLoad);
      audio.addEventListener('error', onError);
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading audio metadata'));
      }, 10000);
      
      audio.src = url;
    });
  }

  /**
   * Get detailed audio metadata
   */
  static async getAudioMetadata(audioBlob: Blob): Promise<AudioMetadata> {
    const duration = await this.getAudioDuration(audioBlob);
    
    return {
      duration,
      fileSize: audioBlob.size,
      format: audioBlob.type || 'unknown'
    };
  }

  /**
   * Analyze audio for silence using Web Audio API
   */
  async analyzeAudioSilence(audioBlob: Blob): Promise<boolean> {
    if (!this.options.enableSilenceDetection) {
      return false;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0); // Use first channel
      const sampleRate = audioBuffer.sampleRate;
      
      // Calculate chunk size for analysis
      const chunkDurationMs = 30; // 30ms chunks
      const samplesPerChunk = Math.floor((sampleRate * chunkDurationMs) / 1000);
      const numChunksForSilence = Math.ceil(this.options.minSilenceDurationMs / chunkDurationMs);
      
      let consecutiveSilentChunks = 0;
      
      for (let i = 0; i < channelData.length; i += samplesPerChunk) {
        const chunk = channelData.slice(i, Math.min(i + samplesPerChunk, channelData.length));
        const rms = this.calculateRMS(chunk);
        
        if (rms < this.options.silenceThreshold) {
          consecutiveSilentChunks++;
          if (consecutiveSilentChunks >= numChunksForSilence) {
            await audioContext.close();
            return true; // Found significant silence
          }
        } else {
          consecutiveSilentChunks = 0;
        }
      }
      
      await audioContext.close();
      return false;
    } catch (error) {
      console.warn('Error analyzing audio silence:', error);
      return false;
    }
  }

  /**
   * Calculate RMS (Root Mean Square) for audio chunk
   */
  private calculateRMS(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    
    let sumOfSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumOfSquares += samples[i] * samples[i];
    }
    
    return Math.sqrt(sumOfSquares / samples.length);
  }

  /**
   * Optimize audio for Whisper API
   */
  async optimizeAudio(audioBlob: Blob): Promise<AudioProcessingResult> {
    const startTime = performance.now();
    const originalSize = audioBlob.size;
    const optimizations: string[] = [];
    
    // Check file size limit
    if (originalSize > CostOptimizer.MAX_FILE_SIZE) {
      throw new Error(`Audio file too large: ${(originalSize / 1024 / 1024).toFixed(1)}MB (limit: 25MB)`);
    }

    // Get audio metadata
    let duration: number;
    let isSilent = false;
    
    try {
      duration = await CostOptimizer.getAudioDuration(audioBlob);
      
      // Check minimum duration
      if (duration < CostOptimizer.MIN_AUDIO_DURATION) {
        throw new Error(`Audio too short: ${duration.toFixed(1)}s (minimum: ${CostOptimizer.MIN_AUDIO_DURATION}s)`);
      }
      
      // Check maximum duration
      if (duration > this.options.maxDuration) {
        optimizations.push(`Audio duration (${duration.toFixed(1)}s) exceeds recommended maximum (${this.options.maxDuration}s)`);
      }
      
      // Analyze for silence
      if (this.options.enableSilenceDetection) {
        isSilent = await this.analyzeAudioSilence(audioBlob);
        if (isSilent) {
          optimizations.push('Significant silence detected - consider trimming');
        }
      }
      
    } catch (error) {
      console.error('Error analyzing audio:', error);
      duration = 0;
    }

    // Calculate cost
    const costCalculation = CostOptimizer.calculateCost(duration);
    
    // Add optimization recommendations
    if (originalSize > 10 * 1024 * 1024) { // > 10MB
      optimizations.push('Large file size detected - consider audio compression');
    }
    
    if (duration > 60) { // > 1 minute
      optimizations.push('Long audio detected - consider breaking into smaller chunks');
    }
    
    if (audioBlob.type === 'audio/wav') {
      optimizations.push('WAV format detected - consider converting to WebM or MP3 for smaller size');
    }

    const processingTime = performance.now() - startTime;
    
    // For now, return original blob (compression would be implemented here)
    return {
      optimizedBlob: audioBlob,
      originalSize,
      optimizedSize: originalSize, // Same as original for now
      estimatedCost: costCalculation.estimatedCost,
      processingTime,
      optimizations,
      duration,
      isSilent
    };
  }

  /**
   * Batch analyze multiple audio files
   */
  async batchAnalyzeAudio(audioBlobs: Blob[]): Promise<AudioProcessingResult[]> {
    const results: AudioProcessingResult[] = [];
    
    for (let i = 0; i < audioBlobs.length; i++) {
      try {
        const result = await this.optimizeAudio(audioBlobs[i]);
        results.push(result);
      } catch (error) {
        console.error(`Error processing audio ${i}:`, error);
        // Add error result
        results.push({
          optimizedBlob: audioBlobs[i],
          originalSize: audioBlobs[i].size,
          optimizedSize: audioBlobs[i].size,
          estimatedCost: 0,
          processingTime: 0,
          optimizations: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          duration: 0,
          isSilent: false
        });
      }
      
      // Small delay between files to prevent blocking
      if (i < audioBlobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Calculate total cost for multiple audio files
   */
  static calculateBatchCost(results: AudioProcessingResult[]): {
    totalCost: number;
    totalDuration: number;
    averageCostPerFile: number;
    recommendations: string[];
  } {
    const totalCost = results.reduce((sum, result) => sum + result.estimatedCost, 0);
    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
    const averageCostPerFile = results.length > 0 ? totalCost / results.length : 0;
    
    // Collect unique recommendations
    const allRecommendations = results.flatMap(result => result.optimizations);
    const recommendations = [...new Set(allRecommendations)];
    
    return {
      totalCost,
      totalDuration,
      averageCostPerFile,
      recommendations
    };
  }

  /**
   * Format cost for display
   */
  static formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Get optimization recommendations for a file
   */
  static getOptimizationRecommendations(metadata: AudioMetadata): string[] {
    const recommendations: string[] = [];
    
    if (metadata.fileSize > 10 * 1024 * 1024) {
      recommendations.push('Consider compressing audio to reduce file size and costs');
    }
    
    if (metadata.duration > 300) { // 5 minutes
      recommendations.push('Long audio detected - breaking into shorter segments may improve processing');
    }
    
    if (metadata.duration < 1) {
      recommendations.push('Very short audio - ensure it contains meaningful content');
    }
    
    if (metadata.format === 'audio/wav') {
      recommendations.push('WAV format is uncompressed - consider WebM or MP3 for better efficiency');
    }
    
    return recommendations;
  }

  /**
   * Validate audio file before sending to API
   */
  static validateAudioFile(audioBlob: Blob): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size
    if (audioBlob.size === 0) {
      errors.push('Audio file is empty');
    }
    
    if (audioBlob.size > this.MAX_FILE_SIZE) {
      errors.push(`File too large: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB (max: 25MB)`);
    }
    
    // Check MIME type
    const validTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/wav',
      'audio/flac',
      'audio/ogg'
    ];
    
    if (audioBlob.type && !validTypes.includes(audioBlob.type)) {
      errors.push(`Unsupported audio format: ${audioBlob.type}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export utility functions
export const AudioCostUtils = {
  WHISPER_COST_PER_MINUTE: CostOptimizer['WHISPER_COST_PER_MINUTE'],
  MAX_FILE_SIZE: CostOptimizer['MAX_FILE_SIZE'],
  MIN_AUDIO_DURATION: CostOptimizer['MIN_AUDIO_DURATION'],
  calculateCost: CostOptimizer.calculateCost.bind(CostOptimizer),
  formatCost: CostOptimizer.formatCost.bind(CostOptimizer),
  formatDuration: CostOptimizer.formatDuration.bind(CostOptimizer),
  getAudioDuration: CostOptimizer.getAudioDuration.bind(CostOptimizer),
  getAudioMetadata: CostOptimizer.getAudioMetadata.bind(CostOptimizer),
  validateAudioFile: CostOptimizer.validateAudioFile.bind(CostOptimizer)
};