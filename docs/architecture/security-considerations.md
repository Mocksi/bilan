# Security Considerations: Privacy-First Architecture

## Executive Summary

Bilan's v0.4.0 transformation implements a privacy-first architecture that prioritizes user data protection while enabling powerful analytics capabilities. This document outlines security principles, data handling practices, and implementation guidelines for all system components.

## Privacy-First Principles

### Core Tenets

1. **Data Minimization**: Collect only necessary data for analytics functionality
2. **User Control**: Provide granular controls over data collection and usage
3. **Transparency**: Clear documentation of what data is collected and how it's used
4. **Security by Design**: Security considerations built into every component
5. **Compliance by Default**: GDPR, CCPA, and other privacy regulations compliance

### Privacy Design Patterns

#### Minimal Data Collection
```typescript
// Only collect essential event properties
const event = {
  event_type: 'conversation_started',
  user_id: 'user-123', // Pseudonymized identifier
  timestamp: Date.now(),
  properties: {
    conversation_id: 'conv-456',
    // NO sensitive data like:
    // - conversation_content
    // - user_email
    // - personal_information
  }
};
```

#### Data Pseudonymization
```typescript
// User ID pseudonymization
const pseudonymizeUserId = (originalUserId: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(originalUserId + process.env.USER_ID_SALT);
  return hash.digest('hex').substring(0, 16);
};

// Conversation ID pseudonymization
const pseudonymizeConversationId = (originalId: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(originalId + process.env.CONVERSATION_ID_SALT);
  return hash.digest('hex').substring(0, 16);
};
```

#### Granular Data Controls
```typescript
interface BilanConfig {
  apiKey: string;
  projectId: string;
  privacy: {
    collectUserId: boolean;           // Default: true
    collectTimestamps: boolean;       // Default: true
    collectMetadata: boolean;         // Default: false
    anonymizeData: boolean;           // Default: false
    retentionDays: number;           // Default: 90
    allowAnalytics: boolean;         // Default: true
    allowExport: boolean;            // Default: false
  };
}
```

## Data Classification and Handling

### Data Classification Levels

#### Public Data
- Event types and counts
- Aggregated statistics
- Performance metrics

#### Internal Data
- Pseudonymized user IDs
- Conversation metadata
- Journey analytics
- Vote patterns

#### Confidential Data
- Raw conversation content (NEVER stored)
- Personal identifiers (email, name)
- Sensitive metadata
- Authentication tokens

#### Restricted Data
- Encryption keys
- Admin credentials
- Database connection strings
- API secrets

### Data Handling Matrix

| Data Type | Collection | Storage | Processing | Retention | Sharing |
|-----------|------------|---------|------------|-----------|---------|
| Event Types | ✅ | ✅ | ✅ | Indefinite | Aggregate Only |
| User IDs | ✅ Pseudonymized | ✅ Hashed | ✅ | 90 days | No |
| Timestamps | ✅ | ✅ | ✅ | 90 days | Aggregate Only |
| Metadata | ⚠️ Optional | ✅ Encrypted | ✅ | 30 days | No |
| Conversation Content | ❌ | ❌ | ❌ | N/A | No |
| Personal Info | ❌ | ❌ | ❌ | N/A | No |

## Security Architecture

### Defense in Depth

#### Layer 1: Client-Side Security
```typescript
// SDK security measures
export class BilanSDK {
  private config: BilanConfig;
  private validator: DataValidator;
  private sanitizer: DataSanitizer;

  track(eventType: string, properties: any) {
    // Input validation
    if (!this.validator.isValidEventType(eventType)) {
      throw new Error('Invalid event type');
    }

    // Data sanitization
    const sanitizedProperties = this.sanitizer.sanitize(properties);
    
    // Remove sensitive data
    const cleanedProperties = this.removeSensitiveData(sanitizedProperties);
    
    // Encrypt before transmission
    const encryptedData = this.encrypt(cleanedProperties);
    
    this.sendToAPI(encryptedData);
  }

  private removeSensitiveData(data: any): any {
    const sensitiveKeys = ['password', 'email', 'ssn', 'credit_card'];
    return Object.keys(data).reduce((acc, key) => {
      if (!sensitiveKeys.includes(key.toLowerCase())) {
        acc[key] = data[key];
      }
      return acc;
    }, {});
  }
}
```

#### Layer 2: Network Security
```typescript
// API security middleware
const securityMiddleware = {
  // Rate limiting
  rateLimit: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP'
  }),

  // Request validation
  validateRequest: (req: Request, res: Response, next: NextFunction) => {
    // API key validation
    if (!req.headers.authorization || !isValidApiKey(req.headers.authorization)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Content type validation
    if (!req.headers['content-type']?.includes('application/json')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Request size validation
    if (req.headers['content-length'] > 1024 * 1024) { // 1MB limit
      return res.status(413).json({ error: 'Request too large' });
    }

    next();
  },

  // HTTPS enforcement
  httpsOnly: (req: Request, res: Response, next: NextFunction) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
    next();
  }
};
```

#### Layer 3: Application Security
```typescript
// Event processing security
export class EventProcessor {
  private schema: EventSchema;
  private sanitizer: DataSanitizer;
  private encryptor: DataEncryptor;

  async processEvent(event: RawEvent): Promise<ProcessedEvent> {
    // Schema validation
    const validationResult = this.schema.validate(event);
    if (!validationResult.isValid) {
      throw new SecurityError(`Invalid event schema: ${validationResult.errors}`);
    }

    // Data sanitization
    const sanitizedEvent = this.sanitizer.sanitize(event);
    
    // Encrypt sensitive properties
    const encryptedEvent = await this.encryptor.encrypt(sanitizedEvent);
    
    // Audit logging
    await this.auditLog.record({
      action: 'event_processed',
      user_id: event.user_id,
      event_type: event.event_type,
      timestamp: new Date(),
      ip_address: event.metadata?.ip_address
    });

    return encryptedEvent;
  }
}
```

#### Layer 4: Data Security
```sql
-- Database security measures
-- Encryption at rest
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  properties JSONB NOT NULL,
  metadata JSONB,
  encrypted_properties BYTEA, -- Encrypted sensitive data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row-level security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy for user data access
CREATE POLICY user_data_access ON events
  FOR ALL
  TO application_role
  USING (user_id = current_setting('app.current_user_id'));

-- Audit trail
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  user_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB
);
```

## Authentication and Authorization

### API Authentication

#### API Key Management
```typescript
interface ApiKey {
  id: string;
  projectId: string;
  keyHash: string;
  permissions: Permission[];
  rateLimit: number;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

interface Permission {
  resource: string; // 'events', 'analytics', 'admin'
  actions: string[]; // 'read', 'write', 'delete'
  conditions?: {
    user_id?: string;
    event_type?: string[];
  };
}

// API key validation
const validateApiKey = async (keyString: string): Promise<ApiKey | null> => {
  const keyHash = crypto.createHash('sha256').update(keyString).digest('hex');
  
  const apiKey = await db.apiKeys.findOne({
    where: { keyHash, expiresAt: { [Op.gt]: new Date() } }
  });
  
  if (apiKey) {
    // Update last used timestamp
    await db.apiKeys.update(
      { lastUsedAt: new Date() },
      { where: { id: apiKey.id } }
    );
  }
  
  return apiKey;
};
```

#### Permission System
```typescript
// Role-based access control
enum Role {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer'
}

const rolePermissions = {
  [Role.ADMIN]: [
    'events:read', 'events:write', 'events:delete',
    'analytics:read', 'analytics:write',
    'admin:read', 'admin:write'
  ],
  [Role.DEVELOPER]: [
    'events:read', 'events:write',
    'analytics:read'
  ],
  [Role.VIEWER]: [
    'events:read',
    'analytics:read'
  ]
};

// Permission middleware
const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.apiKey as ApiKey;
    const hasPermission = apiKey.permissions.some(p => 
      p.resource === permission.split(':')[0] &&
      p.actions.includes(permission.split(':')[1])
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

### Dashboard Authentication

#### OAuth Integration
```typescript
// OAuth provider configuration
const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    scopes: ['openid', 'email', 'profile']
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_REDIRECT_URI,
    scopes: ['user:email']
  }
};

// JWT token management
const generateToken = (user: User): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      projectId: user.projectId
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};
```

## Data Protection

### Encryption Standards

#### Encryption at Rest
```typescript
// Database encryption
const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'pbkdf2',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  iterations: 100000
};

class DataEncryptor {
  private key: Buffer;
  
  constructor(masterKey: string) {
    this.key = crypto.scryptSync(masterKey, 'salt', 32);
  }
  
  encrypt(data: any): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encrypted: encrypted.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  decrypt(encryptedData: EncryptedData): any {
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'hex')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }
}
```

#### Encryption in Transit
```typescript
// TLS configuration
const tlsConfig = {
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256'
  ],
  honorCipherOrder: true,
  secureProtocol: 'TLSv1_2_method'
};

// Certificate pinning
const certificatePinning = {
  pins: [
    'sha256/YLh1dUR9y6Kja30RrAn7JKnbQG/uEtLMkBgFF2Fuihg=',
    'sha256/C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M='
  ],
  maxAge: 5184000, // 60 days
  includeSubdomains: true
};
```

### Data Anonymization

#### Anonymization Techniques
```typescript
class DataAnonymizer {
  // K-anonymity implementation
  static kAnonymize(data: Event[], k: number): Event[] {
    // Group by quasi-identifiers
    const groups = this.groupByQuasiIdentifiers(data);
    
    // Ensure each group has at least k members
    return groups.flatMap(group => {
      if (group.length < k) {
        return this.generalizeGroup(group, k);
      }
      return group;
    });
  }
  
  // Differential privacy
  static addNoise(value: number, epsilon: number): number {
    const scale = 1 / epsilon;
    const noise = this.laplacianNoise(scale);
    return value + noise;
  }
  
  // Data masking
  static maskSensitiveData(data: any): any {
    const maskedData = { ...data };
    
    // Hash user IDs
    if (maskedData.user_id) {
      maskedData.user_id = this.hashValue(maskedData.user_id);
    }
    
    // Remove IP addresses
    if (maskedData.metadata?.ip_address) {
      delete maskedData.metadata.ip_address;
    }
    
    // Generalize timestamps
    if (maskedData.timestamp) {
      maskedData.timestamp = this.generalizeTimestamp(maskedData.timestamp);
    }
    
    return maskedData;
  }
}
```

## Environment Variables

### Required Environment Variables

| Variable | Purpose | Required | Default | Security Notes |
|----------|---------|----------|---------|----------------|
| `USER_ID_SALT` | Salt for user ID pseudonymization | Yes | None | Store securely, rotate regularly |
| `CONVERSATION_ID_SALT` | Salt for conversation ID pseudonymization | Yes | None | Store securely, rotate regularly |
| `JWT_SECRET` | JWT token signing secret | Yes | None | High entropy, never log |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional | None | Public value, safe to log |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Optional | None | Secret value, never log |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI | Optional | None | Public value, safe to log |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Optional | None | Public value, safe to log |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Optional | None | Secret value, never log |
| `GITHUB_REDIRECT_URI` | GitHub OAuth redirect URI | Optional | None | Public value, safe to log |

### Secure Storage Recommendations

```typescript
// Example secure configuration
const secureConfig = {
  // Use environment-specific secrets management
  secrets: {
    userIdSalt: process.env.USER_ID_SALT || (() => {
      throw new Error('USER_ID_SALT environment variable is required')
    })(),
    conversationIdSalt: process.env.CONVERSATION_ID_SALT || (() => {
      throw new Error('CONVERSATION_ID_SALT environment variable is required')
    })(),
    jwtSecret: process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET environment variable is required')
    })()
  },
  
  // OAuth configuration (optional)
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI
    }
  }
}
```

### Environment-Specific Considerations

- **Development**: Use `.env.local` files, never commit to version control
- **Staging**: Use secure environment variable injection
- **Production**: Use dedicated secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
- **Salt Generation**: Use cryptographically secure random values (minimum 32 bytes)
- **Secret Rotation**: Implement regular rotation for all sensitive values

## Compliance Framework

### GDPR Compliance

#### Data Subject Rights
```typescript
interface DataSubjectRequest {
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  userId: string;
  requestedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
}

class GDPRComplianceService {
  // Right to access
  async handleAccessRequest(userId: string): Promise<UserData> {
    const events = await db.events.findAll({
      where: { user_id: userId }
    });
    
    return {
      userId,
      events: events.map(event => ({
        type: event.event_type,
        timestamp: event.timestamp,
        properties: event.properties
      })),
      exportedAt: new Date()
    };
  }
  
  // Right to be forgotten
  async handleErasureRequest(userId: string): Promise<void> {
    // Anonymize instead of delete to maintain analytics integrity
    await db.events.update(
      { 
        user_id: 'anonymized',
        properties: this.anonymizeProperties(userId)
      },
      { where: { user_id: userId } }
    );
    
    // Log the anonymization
    await this.auditLog.record({
      action: 'data_anonymized',
      user_id: userId,
      timestamp: new Date()
    });
  }
  
  // Data portability
  async handlePortabilityRequest(userId: string): Promise<Buffer> {
    const userData = await this.handleAccessRequest(userId);
    return Buffer.from(JSON.stringify(userData, null, 2));
  }
}
```

#### Consent Management
```typescript
interface ConsentRecord {
  userId: string;
  consentType: 'analytics' | 'marketing' | 'functional';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

class ConsentManager {
  async recordConsent(consent: ConsentRecord): Promise<void> {
    await db.consents.create(consent);
    
    // Update user preferences
    await this.updateUserPreferences(consent.userId, {
      [consent.consentType]: consent.granted
    });
  }
  
  async checkConsent(userId: string, consentType: string): Promise<boolean> {
    const consent = await db.consents.findOne({
      where: { userId, consentType },
      order: [['timestamp', 'DESC']]
    });
    
    return consent?.granted || false;
  }
  
  async withdrawConsent(userId: string, consentType: string): Promise<void> {
    await this.recordConsent({
      userId,
      consentType,
      granted: false,
      timestamp: new Date()
    });
    
    // Stop data collection for this user
    await this.stopDataCollection(userId, consentType);
  }
}
```

### Data Retention

#### Retention Policies
```typescript
const retentionPolicies = {
  events: {
    default: 90, // days
    analytics: 365, // days for aggregated analytics
    audit: 2555, // days (7 years for compliance)
  },
  
  personalData: {
    default: 30, // days after account deletion
    legal: 2555, // days for legal requirements
  },
  
  logs: {
    application: 30, // days
    security: 90, // days
    audit: 2555, // days
  }
};

class RetentionManager {
  async enforceRetentionPolicy(): Promise<void> {
    // Clean up old events
    await db.events.destroy({
      where: {
        created_at: {
          [Op.lt]: new Date(Date.now() - retentionPolicies.events.default * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // Clean up old logs
    await db.auditLogs.destroy({
      where: {
        timestamp: {
          [Op.lt]: new Date(Date.now() - retentionPolicies.logs.application * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    // Archive old data
    await this.archiveOldData();
  }
  
  private async archiveOldData(): Promise<void> {
    const oldEvents = await db.events.findAll({
      where: {
        created_at: {
          [Op.between]: [
            new Date(Date.now() - retentionPolicies.events.analytics * 24 * 60 * 60 * 1000),
            new Date(Date.now() - retentionPolicies.events.default * 24 * 60 * 60 * 1000)
          ]
        }
      }
    });
    
    // Move to archive storage
    await this.archiveStorage.store(oldEvents);
    
    // Remove from active database
    await db.events.destroy({
      where: { id: { [Op.in]: oldEvents.map(e => e.id) } }
    });
  }
}
```

## Security Monitoring

### Security Metrics

#### Key Security Indicators
```typescript
const securityMetrics = {
  authentication: {
    'auth.failed_attempts': counter('auth_failed_attempts_total'),
    'auth.successful_logins': counter('auth_successful_logins_total'),
    'auth.token_validation_failures': counter('auth_token_validation_failures_total'),
  },
  
  api: {
    'api.rate_limit_exceeded': counter('api_rate_limit_exceeded_total'),
    'api.invalid_requests': counter('api_invalid_requests_total'),
    'api.suspicious_activity': counter('api_suspicious_activity_total'),
  },
  
  data: {
    'data.access_violations': counter('data_access_violations_total'),
    'data.encryption_failures': counter('data_encryption_failures_total'),
    'data.retention_violations': counter('data_retention_violations_total'),
  }
};
```

#### Security Alerts
```yaml
# Security alerting rules
groups:
  - name: security_alerts
    rules:
      - alert: HighFailedAuthRate
        expr: rate(auth_failed_attempts_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High rate of failed authentication attempts"
          description: "Failed auth rate is {{ $value }} per second"
      
      - alert: SuspiciousAPIActivity
        expr: rate(api_suspicious_activity_total[5m]) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Suspicious API activity detected"
          description: "Suspicious activity rate is {{ $value }} per second"
      
      - alert: DataAccessViolation
        expr: increase(data_access_violations_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Data access violation detected"
          description: "{{ $value }} data access violations in the last 5 minutes"
```

### Incident Response

#### Security Incident Workflow
```typescript
interface SecurityIncident {
  id: string;
  type: 'breach' | 'unauthorized_access' | 'data_leak' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  reportedBy: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  affectedUsers?: string[];
  affectedData?: string[];
  mitigationSteps: string[];
}

class SecurityIncidentManager {
  async reportIncident(incident: Partial<SecurityIncident>): Promise<SecurityIncident> {
    const newIncident = await db.securityIncidents.create({
      ...incident,
      id: generateId(),
      detectedAt: new Date(),
      status: 'open'
    });
    
    // Immediate response based on severity
    if (incident.severity === 'critical') {
      await this.triggerEmergencyResponse(newIncident);
    }
    
    // Notify security team
    await this.notifySecurityTeam(newIncident);
    
    return newIncident;
  }
  
  private async triggerEmergencyResponse(incident: SecurityIncident): Promise<void> {
    // Activate incident response team
    await this.activateIncidentResponseTeam(incident);
    
    // Implement immediate containment measures
    await this.implementContainmentMeasures(incident);
    
    // Begin forensic analysis
    await this.beginForensicAnalysis(incident);
  }
}
```

## Developer Security Practices

### Secure Development Guidelines

#### Code Security Standards
```typescript
// Security code review checklist
const securityChecklist = {
  inputValidation: [
    'All user inputs are validated',
    'SQL injection prevention implemented',
    'XSS protection in place',
    'CSRF tokens used for state-changing operations'
  ],
  
  authentication: [
    'Strong password requirements',
    'Multi-factor authentication supported',
    'Session management secure',
    'Password reset flows secure'
  ],
  
  authorization: [
    'Principle of least privilege applied',
    'Role-based access control implemented',
    'Resource-level permissions checked',
    'Privilege escalation prevented'
  ],
  
  dataProtection: [
    'Sensitive data encrypted at rest',
    'Data encrypted in transit',
    'Proper key management',
    'Data minimization principles followed'
  ]
};
```

#### Security Testing
```typescript
// Security testing framework
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject invalid API keys', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer invalid-key')
        .send({ events: [] });
      
      expect(response.status).toBe(401);
    });
    
    it('should rate limit excessive requests', async () => {
      const requests = Array.from({ length: 1001 }, () =>
        request(app)
          .post('/api/events')
          .set('Authorization', 'Bearer valid-key')
          .send({ events: [] })
      );
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
  
  describe('Data Protection', () => {
    it('should not expose sensitive data in API responses', async () => {
      const response = await request(app)
        .get('/api/events/123')
        .set('Authorization', 'Bearer valid-key');
      
      expect(response.body).not.toHaveProperty('user_email');
      expect(response.body).not.toHaveProperty('conversation_content');
    });
  });
});
```

### Security Training

#### Security Awareness Topics
1. **Threat Modeling**: Understanding potential attack vectors
2. **Secure Coding**: Writing secure code from the ground up
3. **Data Protection**: Handling sensitive data appropriately
4. **Incident Response**: Responding to security incidents
5. **Compliance**: Understanding regulatory requirements
6. **Privacy by Design**: Building privacy into systems

#### Security Tools
```bash
# Static analysis security testing
npm run security:sast

# Dependency vulnerability scanning
npm audit
npm run security:deps

# Dynamic application security testing
npm run security:dast

# Container security scanning
docker scan bilan:latest
```

## Conclusion

Bilan's privacy-first security architecture provides comprehensive protection while enabling powerful analytics capabilities. The multi-layered security approach ensures data protection at every level, from client-side SDKs to database storage.

### Key Security Features
- **End-to-end encryption** protects data in transit and at rest
- **Granular privacy controls** give users control over their data
- **Automatic compliance** with GDPR, CCPA, and other regulations
- **Comprehensive monitoring** detects and responds to security threats
- **Security by design** principles embedded throughout the architecture

### Implementation Priority
1. **Immediate**: Authentication, authorization, and data encryption
2. **Short-term**: Privacy controls and compliance features
3. **Medium-term**: Advanced monitoring and incident response
4. **Long-term**: Continuous security improvement and threat adaptation

The security framework establishes a strong foundation for the v0.4.0 transformation while maintaining user trust and regulatory compliance. 