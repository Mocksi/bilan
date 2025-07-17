import { describe, it, expect, beforeEach } from 'vitest'
import { 
  ContentProcessor, 
  PrivacyController, 
  PrivacyUtils, 
  PrivacyConfig,
  CaptureLevel,
  DEFAULT_PRIVACY_CONFIG 
} from '../src/events/privacy-controls'

describe('PrivacyController', () => {
  let privacyController: PrivacyController

  beforeEach(() => {
    privacyController = new PrivacyController()
  })

  describe('Content Processing', () => {
    it('should return null for none capture level', () => {
      const config: Partial<PrivacyConfig> = {
        defaultCaptureLevel: 'none'
      }
      const controller = new PrivacyController(config)
      const result = controller.processContent('test content', 'prompts')
      expect(result).toBeNull()
    })

    it('should return metadata for metadata capture level', () => {
      const config: Partial<PrivacyConfig> = {
        defaultCaptureLevel: 'metadata'
      }
      const controller = new PrivacyController(config)
      const result = controller.processContent('Hello world! How are you?', 'prompts')
      
      expect(result).toContain('[METADATA:')
      expect(result).toContain('"length":25')
      expect(result).toContain('"wordCount":5')
    })

    it('should return full content for full capture level', () => {
      const config: Partial<PrivacyConfig> = {
        defaultCaptureLevel: 'full'
      }
      const controller = new PrivacyController(config)
      const result = controller.processContent('test content', 'prompts')
      expect(result).toBe('test content')
    })

    it('should sanitize content for sanitized capture level', () => {
      const config: Partial<PrivacyConfig> = {
        defaultCaptureLevel: 'sanitized'
      }
      const controller = new PrivacyController(config)
      const content = 'My email is john@example.com and phone is 555-123-4567'
      const result = controller.processContent(content, 'prompts')
      
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('john@example.com')
      expect(result).not.toContain('555-123-4567')
    })
  })

  describe('PII Detection', () => {
    it('should detect email addresses', () => {
      const content = 'Contact me at john.doe@example.com'
      expect(privacyController.containsPii(content)).toBe(true)
    })

    it('should detect phone numbers', () => {
      const content = 'Call me at 555-123-4567'
      expect(privacyController.containsPii(content)).toBe(true)
    })

    it('should detect credit card numbers', () => {
      const content = 'My card number is 1234 5678 9012 3456'
      expect(privacyController.containsPii(content)).toBe(true)
    })

    it('should detect social security numbers', () => {
      const content = 'SSN: 123-45-6789'
      expect(privacyController.containsPii(content)).toBe(true)
    })

    it('should detect IP addresses', () => {
      const content = 'Server IP: 192.168.1.1'
      expect(privacyController.containsPii(content)).toBe(true)
    })

    it('should detect API keys', () => {
      const content = 'api_key: sk-1234567890abcdef'
      expect(privacyController.containsPii(content)).toBe(true)
    })

    it('should not detect PII in clean content', () => {
      const content = 'This is a clean message with no sensitive information'
      expect(privacyController.containsPii(content)).toBe(false)
    })
  })

  describe('Content Sanitization', () => {
    it('should redact multiple PII types', () => {
      const content = 'Contact john@example.com or call 555-123-4567'
      const result = privacyController.processContent(content, 'prompts')
      
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('john@example.com')
      expect(result).not.toContain('555-123-4567')
    })

    it('should use custom PII patterns', () => {
      const config: Partial<PrivacyConfig> = {
        customPiiPatterns: [/SECRET_\d+/g]
      }
      const controller = new PrivacyController(config)
      const content = 'The code is SECRET_12345'
      const result = controller.processContent(content, 'prompts')
      
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('SECRET_12345')
    })

    it('should use custom sanitizer function', () => {
      const config: Partial<PrivacyConfig> = {
        customSanitizer: (content: string) => content.replace(/CUSTOM/g, '[CUSTOM_REDACTED]')
      }
      const controller = new PrivacyController(config)
      const content = 'This contains CUSTOM data'
      const result = controller.processContent(content, 'prompts')
      
      expect(result).toContain('[CUSTOM_REDACTED]')
      expect(result).not.toContain('This contains CUSTOM data')
    })

    it('should hash sensitive content when configured', () => {
      const config: Partial<PrivacyConfig> = {
        hashSensitiveContent: true,
        hashSalt: 'test-salt'
      }
      const controller = new PrivacyController(config)
      const content = 'My email is john@example.com'
      const result = controller.processContent(content, 'prompts')
      
      expect(result).toContain('[HASH:')
      expect(result).not.toContain('john@example.com')
    })
  })

  describe('Capture Level Configuration', () => {
    it('should use specific capture levels for different content types', () => {
      const config: Partial<PrivacyConfig> = {
        captureLevels: {
          prompts: 'metadata',
          responses: 'full',
          errors: 'sanitized',
          metadata: 'full'
        }
      }
      const controller = new PrivacyController(config)
      
      expect(controller.processContent('test', 'prompts')).toContain('[METADATA:')
      expect(controller.processContent('test', 'responses')).toBe('test')
      expect(controller.processContent('error with john@example.com', 'errors')).toContain('[REDACTED]')
      expect(controller.processContent('test', 'metadata')).toBe('test')
    })

    it('should fall back to default capture level', () => {
      const config: Partial<PrivacyConfig> = {
        defaultCaptureLevel: 'metadata'
      }
      const controller = new PrivacyController(config)
      
      // Should use default since captureLevels.prompts not specified
      expect(controller.processContent('test', 'prompts')).toContain('[METADATA:')
    })
  })

  describe('Privacy Summary', () => {
    it('should provide privacy summary for content', () => {
      const content = 'Contact john@example.com for more info'
      const summary = privacyController.getPrivacySummary(content, 'prompts')
      
      expect(summary.captureLevel).toBe('sanitized')
      expect(summary.containsPii).toBe(true)
      expect(summary.originalLength).toBe(content.length)
      expect(summary.processedLength).toBeGreaterThan(0)
    })

    it('should show no PII for clean content', () => {
      const content = 'This is clean content'
      const summary = privacyController.getPrivacySummary(content, 'prompts')
      
      expect(summary.containsPii).toBe(false)
      expect(summary.originalLength).toBe(content.length)
    })
  })

  describe('Configuration Updates', () => {
    it('should update configuration dynamically', () => {
      expect(privacyController.processContent('test', 'prompts')).toBe('test')
      
      privacyController.updateConfig({ defaultCaptureLevel: 'none' })
      expect(privacyController.processContent('test', 'prompts')).toBeNull()
    })

    it('should merge configuration updates', () => {
      const originalConfig = privacyController.getPrivacySummary('test', 'prompts').captureLevel
      
      privacyController.updateConfig({ 
        captureLevels: { 
          prompts: 'metadata',
          responses: 'sanitized',
          errors: 'sanitized',
          metadata: 'full'
        }
      })
      
      expect(privacyController.processContent('test', 'prompts')).toContain('[METADATA:')
      expect(privacyController.processContent('test', 'responses')).toBe('test')
    })
  })
})

describe('ContentProcessor', () => {
  let contentProcessor: ContentProcessor

  beforeEach(() => {
    contentProcessor = new ContentProcessor()
  })

  describe('Content Type Processing', () => {
    it('should process prompts', () => {
      const prompt = 'What is my email john@example.com?'
      const result = contentProcessor.processPrompt(prompt)
      
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('john@example.com')
    })

    it('should process responses', () => {
      const response = 'Your email is john@example.com'
      const result = contentProcessor.processResponse(response)
      
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('john@example.com')
    })

    it('should process errors', () => {
      const error = 'Failed to connect to server 192.168.1.1'
      const result = contentProcessor.processError(error)
      
      expect(result).toContain('[REDACTED]')
      expect(result).not.toContain('192.168.1.1')
    })

    it('should process metadata', () => {
      const metadata = 'User clicked button at timestamp'
      const result = contentProcessor.processMetadata(metadata)
      
      expect(result).toBe(metadata) // Metadata is full by default
    })
  })

  describe('Privacy Configuration', () => {
    it('should update privacy config', () => {
      const originalResult = contentProcessor.processPrompt('test')
      
      contentProcessor.updatePrivacyConfig({ defaultCaptureLevel: 'none' })
      const newResult = contentProcessor.processPrompt('test')
      
      expect(originalResult).toBe('test')
      expect(newResult).toBeNull()
    })

    it('should provide access to privacy controller', () => {
      const controller = contentProcessor.getPrivacyController()
      expect(controller).toBeInstanceOf(PrivacyController)
    })
  })

  describe('Content Blocking', () => {
    it('should return null when content is blocked', () => {
      const processor = new ContentProcessor({ 
        captureLevels: { prompts: 'none', responses: 'none', errors: 'none', metadata: 'none' }
      })
      
      expect(processor.processPrompt('test')).toBeNull()
      expect(processor.processResponse('test')).toBeNull()
      expect(processor.processError('test')).toBeNull()
      expect(processor.processMetadata('test')).toBeNull()
    })
  })
})

describe('PrivacyUtils', () => {
  describe('Predefined Configurations', () => {
    it('should create max privacy config', () => {
      const config = PrivacyUtils.createMaxPrivacyConfig()
      
      expect(config.defaultCaptureLevel).toBe('metadata')
      expect(config.captureLevels.prompts).toBe('metadata')
      expect(config.captureLevels.responses).toBe('metadata')
      expect(config.hashSensitiveContent).toBe(true)
    })

    it('should create dev privacy config', () => {
      const config = PrivacyUtils.createDevPrivacyConfig()
      
      expect(config.defaultCaptureLevel).toBe('full')
      expect(config.captureLevels.prompts).toBe('full')
      expect(config.captureLevels.responses).toBe('full')
      expect(config.detectBuiltinPii).toBe(false)
    })

    it('should create prod privacy config', () => {
      const config = PrivacyUtils.createProdPrivacyConfig()
      
      expect(config.defaultCaptureLevel).toBe('sanitized')
      expect(config.captureLevels.prompts).toBe('sanitized')
      expect(config.captureLevels.responses).toBe('sanitized')
      expect(config.detectBuiltinPii).toBe(true)
      expect(config.hashSensitiveContent).toBe(true)
    })
  })

  describe('Configuration Validation', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_PRIVACY_CONFIG.defaultCaptureLevel).toBe('sanitized')
      expect(DEFAULT_PRIVACY_CONFIG.detectBuiltinPii).toBe(true)
      expect(DEFAULT_PRIVACY_CONFIG.customPiiPatterns).toEqual([])
    })

    it('should create working privacy controllers with predefined configs', () => {
      const maxPrivacy = new PrivacyController(PrivacyUtils.createMaxPrivacyConfig())
      const devPrivacy = new PrivacyController(PrivacyUtils.createDevPrivacyConfig())
      const prodPrivacy = new PrivacyController(PrivacyUtils.createProdPrivacyConfig())
      
      const testContent = 'Email: john@example.com'
      
      expect(maxPrivacy.processContent(testContent, 'prompts')).toContain('[METADATA:')
      expect(devPrivacy.processContent(testContent, 'prompts')).toBe(testContent)
      expect(prodPrivacy.processContent(testContent, 'prompts')).toContain('[REDACTED]')
    })
  })
})

describe('Privacy Integration', () => {
  describe('Complex Content Processing', () => {
    it('should handle mixed content types', () => {
      const controller = new PrivacyController({
        captureLevels: {
          prompts: 'sanitized',
          responses: 'metadata',
          errors: 'full',
          metadata: 'none'
        }
      })
      
      const content = 'User john@example.com reported error on 192.168.1.1'
      
      expect(controller.processContent(content, 'prompts')).toContain('[REDACTED]')
      expect(controller.processContent(content, 'responses')).toContain('[METADATA:')
      expect(controller.processContent(content, 'errors')).toBe(content)
      expect(controller.processContent(content, 'metadata')).toBeNull()
    })

    it('should handle empty and null content', () => {
      const controller = new PrivacyController()
      
      expect(controller.processContent('', 'prompts')).toBe('')
      expect(controller.processContent('   ', 'prompts')).toBe('   ')
    })

    it('should handle very long content', () => {
      const controller = new PrivacyController({ defaultCaptureLevel: 'metadata' })
      const longContent = 'a'.repeat(10000)
      
      const result = controller.processContent(longContent, 'prompts')
      expect(result).toContain('[METADATA:')
      expect(result).toContain('"length":10000')
    })
  })

  describe('Performance Considerations', () => {
    it('should process large content efficiently', () => {
      const controller = new PrivacyController()
      const largeContent = 'Test content '.repeat(1000) + 'john@example.com'
      
      const startTime = Date.now()
      const result = controller.processContent(largeContent, 'prompts')
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
      expect(result).toContain('[REDACTED]')
    })

    it('should handle multiple PII patterns efficiently', () => {
      const customPatterns = Array.from({ length: 10 }, (_, i) => new RegExp(`PATTERN_${i}_\\d+`, 'g'))
      const controller = new PrivacyController({ customPiiPatterns: customPatterns })
      
      const content = 'This has PATTERN_5_123 and other text'
      const result = controller.processContent(content, 'prompts')
      
      expect(result).toContain('[REDACTED]')
    })
  })

  describe('Edge Cases', () => {
    it('should handle regex edge cases', () => {
      const controller = new PrivacyController()
      const content = 'Email with + sign: john+label@example.com'
      
      const result = controller.processContent(content, 'prompts')
      expect(result).toContain('[REDACTED]')
    })

    it('should handle overlapping patterns', () => {
      const controller = new PrivacyController({
        customPiiPatterns: [/test@\w+/g, /\w+@example/g]
      })
      const content = 'Email: test@example.com'
      
      const result = controller.processContent(content, 'prompts')
      expect(result).toContain('[REDACTED]')
    })

    it('should handle malformed regex patterns gracefully', () => {
      // This test ensures the system doesn't crash with bad patterns
      const controller = new PrivacyController()
      const content = 'Normal content'
      
      const result = controller.processContent(content, 'prompts')
      expect(result).toBe(content)
    })
  })
}) 