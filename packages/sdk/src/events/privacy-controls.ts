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
 * Built-in PII patterns for common sensitive data
 */
const BUILTIN_PII_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (US format)
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // Credit card numbers (basic pattern)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // Social Security Numbers
  /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // IP addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // API keys (common patterns)
  /\b(?:api[_-]?key|token|secret)[_-]?[:=]\s*['"]*([a-zA-Z0-9_-]{10,})['"]*\b/gi,
  
  // URLs with potential sensitive info
  /https?:\/\/[^\s]+/g
];

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
    const captureLevel = this.config.captureLevels[contentType] ?? this.config.defaultCaptureLevel;
    
    switch (captureLevel) {
      case 'none':
        return null;
      
      case 'metadata':
        return this.extractMetadata(content);
      
      case 'sanitized':
        return this.sanitizeContent(content, contentType);
      
      case 'full':
        return content;
      
      default:
        return this.sanitizeContent(content, contentType);
    }
  }

  /**
   * Extract only metadata from content (length, type, etc.)
   */
  private extractMetadata(content: string): string {
    const metadata = {
      length: content.length,
      wordCount: content.split(/\s+/).length,
      hasNumbers: /\d/.test(content),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(content),
      estimatedSentences: content.split(/[.!?]+/).length - 1
    };
    
    return `[METADATA: ${JSON.stringify(metadata)}]`;
  }

  /**
   * Sanitize content by removing PII and sensitive information
   */
  private sanitizeContent(content: string, contentType: string): string {
    let sanitized = content;
    
    // Apply built-in PII detection first
    if (this.config.detectBuiltinPii) {
      sanitized = this.removePiiPatterns(sanitized, BUILTIN_PII_PATTERNS);
    }
    
    // Apply custom PII patterns
    if (this.config.customPiiPatterns.length > 0) {
      sanitized = this.removePiiPatterns(sanitized, this.config.customPiiPatterns);
    }
    
    // Apply custom sanitizer last if provided
    if (this.config.customSanitizer) {
      sanitized = this.config.customSanitizer(sanitized, contentType);
    }
    
    return sanitized;
  }

  /**
   * Remove PII based on provided patterns
   */
  private removePiiPatterns(content: string, patterns: RegExp[]): string {
    let sanitized = content;
    
    patterns.forEach(pattern => {
      if (this.config.hashSensitiveContent && this.config.hashSalt) {
        // Replace with hash
        sanitized = sanitized.replace(pattern, (match) => {
          const hash = this.hashString(match + this.config.hashSalt!);
          return `[HASH:${hash.substring(0, 8)}]`;
        });
      } else {
        // Replace with redaction marker
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
    });
    
    return sanitized;
  }

  /**
   * Simple hash function for content
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Check if content contains potential PII
   */
  containsPii(content: string): boolean {
    const allPatterns = [
      ...(this.config.detectBuiltinPii ? BUILTIN_PII_PATTERNS : []),
      ...this.config.customPiiPatterns
    ];
    
    return allPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Get privacy summary for content
   */
  getPrivacySummary(content: string, contentType: keyof PrivacyConfig['captureLevels']): {
    captureLevel: CaptureLevel;
    containsPii: boolean;
    processedLength: number;
    originalLength: number;
  } {
    const captureLevel = this.config.captureLevels[contentType] || this.config.defaultCaptureLevel;
    const processedContent = this.processContent(content, contentType);
    
    return {
      captureLevel,
      containsPii: this.containsPii(content),
      processedLength: processedContent?.length || 0,
      originalLength: content.length
    };
  }
}

/**
 * Privacy-aware content processor for different content types
 */
export class ContentProcessor {
  private privacyController: PrivacyController;

  constructor(privacyConfig: Partial<PrivacyConfig> = {}) {
    this.privacyController = new PrivacyController(privacyConfig);
  }

  /**
   * Process prompt content
   */
  processPrompt(prompt: string): string | null {
    return this.privacyController.processContent(prompt, 'prompts');
  }

  /**
   * Process AI response content
   */
  processResponse(response: string): string | null {
    return this.privacyController.processContent(response, 'responses');
  }

  /**
   * Process error content
   */
  processError(error: string): string | null {
    return this.privacyController.processContent(error, 'errors');
  }

  /**
   * Process metadata
   */
  processMetadata(metadata: string): string | null {
    return this.privacyController.processContent(metadata, 'metadata');
  }

  /**
   * Update privacy configuration
   */
  updatePrivacyConfig(config: Partial<PrivacyConfig>): void {
    this.privacyController.updateConfig(config);
  }

  /**
   * Get privacy controller for advanced operations
   */
  getPrivacyController(): PrivacyController {
    return this.privacyController;
  }
}

/**
 * Utility functions for common privacy operations
 */
export const PrivacyUtils = {
  /**
   * Create a privacy config for maximum privacy
   */
  createMaxPrivacyConfig(): PrivacyConfig {
    return {
      ...DEFAULT_PRIVACY_CONFIG,
      defaultCaptureLevel: 'metadata',
      captureLevels: {
        prompts: 'metadata',
        responses: 'metadata',
        errors: 'sanitized',
        metadata: 'full'
      },
      hashSensitiveContent: true
    };
  },

  /**
   * Create a privacy config for development (full capture)
   */
  createDevPrivacyConfig(): PrivacyConfig {
    return {
      ...DEFAULT_PRIVACY_CONFIG,
      defaultCaptureLevel: 'full',
      captureLevels: {
        prompts: 'full',
        responses: 'full',
        errors: 'full',
        metadata: 'full'
      },
      detectBuiltinPii: false
    };
  },

  /**
   * Create a privacy config for production (balanced)
   */
  createProdPrivacyConfig(): PrivacyConfig {
    return {
      ...DEFAULT_PRIVACY_CONFIG,
      defaultCaptureLevel: 'sanitized',
      captureLevels: {
        prompts: 'sanitized',
        responses: 'sanitized',
        errors: 'sanitized',
        metadata: 'full'
      },
      detectBuiltinPii: true,
      hashSensitiveContent: true
    };
  }
}; 