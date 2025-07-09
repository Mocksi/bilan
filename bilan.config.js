// bilan.config.js
// Configuration file for Bilan Trust Analytics

module.exports = {
  /**
   * Basic Configuration
   */
  // Your Bilan API key (required)
  apiKey: process.env.BILAN_API_KEY,
  
  // Project identifier (optional, defaults to package.json name)
  projectId: 'my-ai-app',
  
  // Environment (development, staging, production)
  environment: process.env.NODE_ENV || 'development',

  /**
   * SDK Configuration
   */
  sdk: {
    // Enable/disable SDK (useful for testing)
    enabled: true,
    
    // Debug mode - logs detailed information
    debug: process.env.NODE_ENV === 'development',
    
    // API endpoint (optional, defaults to Bilan's hosted service)
    apiEndpoint: 'https://api.bilan.dev',
    
    // Request timeout in milliseconds
    timeout: 5000,
    
    // Retry configuration
    retry: {
      attempts: 3,
      delay: 1000,
      backoff: 2.0
    },
    
    // Batch configuration
    batch: {
      enabled: true,
      maxSize: 100,
      flushInterval: 30000 // 30 seconds
    }
  },

  /**
   * Analytics Configuration
   */
  analytics: {
    // Enable/disable trust scoring
    trustScoring: true,
    
    // Trust score calculation settings
    trustScore: {
      // Minimum votes required for a reliable score
      minVotes: 5,
      
      // Decay factor for older votes (0.0 to 1.0)
      decayFactor: 0.1,
      
      // Time window for score calculation (in milliseconds)
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
      
      // Confidence threshold for routing decisions
      confidenceThreshold: 0.8
    },
    
    // Trend calculation settings
    trend: {
      // Sensitivity for trend detection (0.0 to 1.0)
      sensitivity: 0.1,
      
      // Hours for time weighting (recent events matter more)
      timeWeightHours: 24,
      
      // Minimum sample size for trend calculation
      minSampleSize: 10,
      
      // Size of the recent window for comparison
      recentWindowSize: 50
    },
    
    // Enable/disable real-time updates
    realtime: false,
    
    // Event sampling rate (0.0 to 1.0)
    sampleRate: 1.0
  },

  /**
   * Data Storage Configuration
   */
  storage: {
    // Storage type: 'localStorage', 'sessionStorage', 'memory', 'none'
    type: 'localStorage',
    
    // Storage key prefix
    prefix: 'bilan_',
    
    // Maximum number of events to store locally
    maxEvents: 1000,
    
    // Enable/disable local storage encryption
    encryption: false
  },

  /**
   * Privacy Configuration
   */
  privacy: {
    // Enable/disable user ID collection
    collectUserIds: true,
    
    // Enable/disable IP address collection
    collectIpAddresses: false,
    
    // Enable/disable user agent collection
    collectUserAgents: true,
    
    // Data retention period (in days)
    retentionDays: 30,
    
    // Enable/disable GDPR compliance features
    gdprCompliance: true,
    
    // Anonymize user data after this many days
    anonymizeAfterDays: 7
  },

  /**
   * Model Routing Configuration
   */
  routing: {
    // Enable/disable automatic model routing
    enabled: false,
    
    // Routing strategy: 'trust_score', 'performance', 'cost', 'custom'
    strategy: 'trust_score',
    
    // Model configurations
    models: {
      'gpt-4': {
        trustThreshold: 0.8,
        costMultiplier: 1.0,
        maxRequestsPerMinute: 60
      },
      'gpt-3.5-turbo': {
        trustThreshold: 0.6,
        costMultiplier: 0.3,
        maxRequestsPerMinute: 200
      }
    },
    
    // Fallback model when primary model fails
    fallbackModel: 'gpt-3.5-turbo',
    
    // Custom routing function
    customRouter: null
  },

  /**
   * Alerts Configuration
   */
  alerts: {
    // Enable/disable alerts
    enabled: false,
    
    // Alert thresholds
    thresholds: {
      // Trust score drops below this value
      lowTrustScore: 0.3,
      
      // Error rate exceeds this percentage
      highErrorRate: 0.1,
      
      // Response time exceeds this value (in milliseconds)
      slowResponse: 5000
    },
    
    // Notification channels
    channels: {
      email: {
        enabled: false,
        recipients: ['admin@example.com']
      },
      webhook: {
        enabled: false,
        url: 'https://hooks.slack.com/services/...'
      }
    }
  },

  /**
   * Development Configuration
   */
  development: {
    // Enable/disable mock mode (useful for testing)
    mockMode: false,
    
    // Mock responses
    mockResponses: {
      trustScore: 0.75,
      trend: 'stable',
      recommendations: []
    },
    
    // Enable/disable verbose logging
    verbose: false,
    
    // Test data generation
    generateTestData: false
  },

  /**
   * Advanced Configuration
   */
  advanced: {
    // Custom event transformers
    eventTransformers: [],
    
    // Custom trust score algorithms
    trustScoreAlgorithm: null,
    
    // Custom trend detection algorithms
    trendAlgorithm: null,
    
    // Enable/disable performance monitoring
    performanceMonitoring: true,
    
    // Custom middleware
    middleware: [],
    
    // Feature flags
    features: {
      experimentalFeatures: false,
      betaFeatures: false
    }
  }
};

// Example usage in different environments:

// Development
if (process.env.NODE_ENV === 'development') {
  module.exports.sdk.debug = true;
  module.exports.analytics.sampleRate = 0.1; // Sample 10% of events
  module.exports.development.verbose = true;
}

// Testing
if (process.env.NODE_ENV === 'test') {
  module.exports.sdk.enabled = false;
  module.exports.development.mockMode = true;
  module.exports.storage.type = 'memory';
}

// Production
if (process.env.NODE_ENV === 'production') {
  module.exports.sdk.debug = false;
  module.exports.analytics.sampleRate = 1.0; // Sample all events
  module.exports.alerts.enabled = true;
} 