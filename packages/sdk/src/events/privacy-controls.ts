/**
 * Privacy controls for content capture in Bilan SDK
 * Provides fine-grained control over what content gets captured and sent to analytics
 */

export type CaptureLevel = 'none' | 'metadata' | 'sanitized' | 'full';

export interface PrivacyConfig {
  /** Default capture level for all content */
  defaultCaptureLevel: CaptureLevel;
  
  /** Specific capture levels for different content types */
  captureLevels: {
    prompts: CaptureLevel;
    responses: CaptureLevel;
    errors: CaptureLevel;
    metadata: CaptureLevel;
  };
  
  /** Custom PII patterns to detect and redact */
  customPiiPatterns: RegExp[];
  
  /** Whether to detect and redact built-in PII patterns */
  detectBuiltinPii: boolean;
  
  /** Custom sanitization function */
  customSanitizer?: (content: string, contentType: string) => string;
  
  /** Whether to hash sensitive content instead of redacting */
  hashSensitiveContent: boolean;
  
  /** Salt for hashing (should be unique per application) */
  hashSalt?: string;
}

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  defaultCaptureLevel: 'sanitized',
  captureLevels: {
    prompts: 'sanitized',
    responses: 'sanitized',
    errors: 'sanitized',
    metadata: 'full'
  },
  customPiiPatterns: [],
  detectBuiltinPii: true,
  hashSensitiveContent: false
};

/**
 * Lazy-loaded PII patterns to reduce initial bundle size
 */
let builtinPiiPatterns: RegExp[] | null = null;

function getBuiltinPiiPatterns(): RegExp[] {
  if (builtinPiiPatterns === null) {
    builtinPiiPatterns = [
      // Email addresses (simplified)
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      
      // Phone numbers (US format, simplified)
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      
      // Credit card numbers (simplified)
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      
      // Social Security Numbers
      /\b\d{3}-\d{2}-\d{4}\b/g,
      
      // IP addresses
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      
      // API keys (simplified)
      /\b(?:api[_-]?key|token|secret)[_-]?[:=]\s*['"]*([a-zA-Z0-9_-]{10,})['"]*\b/gi,
      
      // URLs (simplified)
      /https?:\/\/[^\s]+/g
    ];
  }
  return builtinPiiPatterns;
}

/**
 * Advanced content sanitizer with configurable privacy controls
 */
export class PrivacyController {
  private config: PrivacyConfig;

  constructor(config: Partial<PrivacyConfig> = {}) {
    // If defaultCaptureLevel is explicitly set, use it for all content types unless overridden
    const baseCaptureLevel = config.defaultCaptureLevel || DEFAULT_PRIVACY_CONFIG.defaultCaptureLevel;
    const baseCapturelevels = config.defaultCaptureLevel ? {
      prompts: baseCaptureLevel,
      responses: baseCaptureLevel,
      errors: baseCaptureLevel,
      metadata: baseCaptureLevel
    } : DEFAULT_PRIVACY_CONFIG.captureLevels;
    
    this.config = { 
      ...DEFAULT_PRIVACY_CONFIG, 
      ...config,
      captureLevels: {
        ...baseCapturelevels,
        ...(config.captureLevels || {})
      }
    };
  }

  /**
   * Update privacy configuration
   */
  updateConfig(config: Partial<PrivacyConfig>): void {
    // If defaultCaptureLevel is being updated, apply it to all content types unless overridden
    const newBaseCaptureLevel = config.defaultCaptureLevel || this.config.defaultCaptureLevel;
    const newBaseCapturelevels = config.defaultCaptureLevel ? {
      prompts: newBaseCaptureLevel,
      responses: newBaseCaptureLevel,
      errors: newBaseCaptureLevel,
      metadata: newBaseCaptureLevel
    } : this.config.captureLevels;
    
    this.config = { 
      ...this.config, 
      ...config,
      captureLevels: {
        ...newBaseCapturelevels,
        ...(config.captureLevels || {})
      }
    };
  }

  /**
   * Process content based on capture level and privacy settings
   */
  processContent(content: string, contentType: keyof PrivacyConfig['captureLevels']): string | null {
    const captureLevel = this.config.captureLevels[contentType];
    
    switch (captureLevel) {
      case 'none':
        return null;
      case 'metadata':
        return `[METADATA: ${this.extractMetadata(content)}]`;
      case 'sanitized':
        return this.sanitizeContent(content, contentType);
      case 'full':
        return content;
      default:
        return this.sanitizeContent(content, contentType);
    }
  }

  /**
   * Extract only metadata from content
   */
  private extractMetadata(content: string): string {
    if (!content || typeof content !== 'string') {
      return JSON.stringify({
        length: 0,
        wordCount: 0,
        hasSpecialChars: false,
        hash: this.hashContent('')
      });
    }
    
    const metadata = {
      length: content.length,
      wordCount: content.split(/\s+/).length,
      hasSpecialChars: /[^a-zA-Z0-9\s]/.test(content),
      hash: this.hashContent(content.substring(0, 100)) // Hash first 100 chars
    };
    
    return JSON.stringify(metadata);
  }

  /**
   * Sanitize content by removing PII and sensitive information
   */
  private sanitizeContent(content: string, contentType: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }
    let sanitized = content;
    
    // Apply custom sanitizer if provided
    if (this.config.customSanitizer) {
      sanitized = this.config.customSanitizer(sanitized, contentType);
    }
    
    // Apply built-in PII detection if enabled
    if (this.config.detectBuiltinPii) {
      const patterns = getBuiltinPiiPatterns();
      for (const pattern of patterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
    }
    
    // Apply custom PII patterns
    for (const pattern of this.config.customPiiPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    // Hash sensitive content if enabled
    if (this.config.hashSensitiveContent) {
      return this.hashContent(sanitized);
    }
    
    return sanitized;
  }

  /**
   * Hash content for privacy while maintaining some utility
   */
  private hashContent(content: string): string {
    const salt = this.config.hashSalt || 'bilan-default-salt';
    const combined = salt + content;
    
    // Simple hash function (not cryptographically secure, but sufficient for privacy)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `[HASH:${Math.abs(hash).toString(36)}]`;
  }

  /**
   * Check if content should be captured based on privacy settings
   */
  shouldCapture(contentType: keyof PrivacyConfig['captureLevels']): boolean {
    return this.config.captureLevels[contentType] !== 'none';
  }

  /**
   * Get current privacy configuration
   */
  getConfig(): PrivacyConfig {
    return { ...this.config };
  }

  /**
   * Check if content contains PII
   */
  containsPii(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    if (!this.config.detectBuiltinPii && this.config.customPiiPatterns.length === 0) {
      return false;
    }
    
    // Check built-in PII patterns
    if (this.config.detectBuiltinPii) {
      const patterns = getBuiltinPiiPatterns();
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return true;
        }
      }
    }
    
    // Check custom PII patterns
    for (const pattern of this.config.customPiiPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get privacy summary for content
   */
  getPrivacySummary(content: string, contentType: keyof PrivacyConfig['captureLevels']): {
    captureLevel: CaptureLevel;
    containsPii: boolean;
    processedContent: string | null;
    originalLength: number;
    processedLength: number;
  } {
    if (!content || typeof content !== 'string') {
      return {
        captureLevel: this.config.captureLevels[contentType],
        containsPii: false,
        processedContent: null,
        originalLength: 0,
        processedLength: 0
      };
    }
    
    const captureLevel = this.config.captureLevels[contentType];
    const containsPii = this.containsPii(content);
    const processedContent = this.processContent(content, contentType);
    
    return {
      captureLevel,
      containsPii,
      processedContent,
      originalLength: content.length,
      processedLength: processedContent?.length || 0
    };
  }


}

/**
 * Content processor for different types of content
 */
export class ContentProcessor {
  private privacyController: PrivacyController;

  constructor(privacyController?: PrivacyController) {
    this.privacyController = privacyController || new PrivacyController();
  }

  /**
   * Process prompt content
   */
  processPrompt(prompt: string): string | null {
    return this.privacyController.processContent(prompt, 'prompts');
  }

  /**
   * Process response content
   */
  processResponse(response: string): string | null {
    return this.privacyController.processContent(response, 'responses');
  }

  /**
   * Process error content
   */
  processError(error: string): string | null {
    if (!error || typeof error !== 'string') {
      return null;
    }
    return this.privacyController.processContent(error, 'errors');
  }

  /**
   * Process metadata content
   */
  processMetadata(metadata: Record<string, any>): Record<string, any> {
    if (!this.privacyController.shouldCapture('metadata')) {
      return {};
    }
    
    const processed: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        processed[key] = this.privacyController.processContent(value, 'metadata');
      } else {
        processed[key] = value;
      }
    }
    
    return processed;
  }

  /**
   * Update privacy configuration (for backward compatibility)
   */
  updatePrivacyConfig(config: Partial<PrivacyConfig>): void {
    this.privacyController.updateConfig(config);
  }

  /**
   * Get privacy controller (for backward compatibility)
   */
  getPrivacyController(): PrivacyController {
    return this.privacyController;
  }
}

/**
 * Utility functions for common privacy configurations
 */
export const PrivacyUtils = {
  /**
   * Development configuration - captures everything for debugging
   */
  createDevPrivacyConfig(): Partial<PrivacyConfig> {
    return {
      defaultCaptureLevel: 'full',
      captureLevels: {
        prompts: 'full',
        responses: 'full',
        errors: 'full',
        metadata: 'full'
      },
      detectBuiltinPii: false,
      hashSensitiveContent: false
    };
  },

  /**
   * Production configuration - balanced privacy and utility
   */
  createProdPrivacyConfig(): Partial<PrivacyConfig> {
    return {
      defaultCaptureLevel: 'sanitized',
      captureLevels: {
        prompts: 'sanitized',
        responses: 'sanitized',
        errors: 'sanitized',
        metadata: 'full'
      },
      detectBuiltinPii: true,
      hashSensitiveContent: false
    };
  },

  /**
   * Maximum privacy configuration - minimal data collection
   */
  createMaxPrivacyConfig(): Partial<PrivacyConfig> {
    return {
      defaultCaptureLevel: 'metadata',
      captureLevels: {
        prompts: 'metadata',
        responses: 'metadata',
        errors: 'metadata',
        metadata: 'metadata'
      },
      detectBuiltinPii: true,
      hashSensitiveContent: true
    };
  },

  /**
   * Get default privacy configuration
   */
  getDefaultConfig(): PrivacyConfig {
    return { ...DEFAULT_PRIVACY_CONFIG };
  }
}; 