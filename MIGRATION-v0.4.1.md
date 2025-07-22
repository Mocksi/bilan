# Migration Guide: v0.4.0 → v0.4.1

## Overview

Bilan v0.4.1 introduces **Turn ID Unification** - a significant improvement that replaces the confusing dual-ID system with industry-standard event correlation. This follows proven patterns from Amplitude, Mixpanel, and other major analytics platforms.

## 🚀 **Key Benefits of Upgrading**

### **Simplified Event Correlation**
- **Before**: Manual `promptId` creation separate from `turn_id`
- **After**: Single `turnId` returned by `trackTurn()` for all related events

### **Industry-Standard Patterns**  
- **Before**: Unique dual-ID approach unlike other analytics platforms
- **After**: Follows Amplitude/Mixpanel event correlation patterns

### **Automatic Relationship Tracking**
- **Before**: No built-in correlation between turns and votes
- **After**: Automatic turn-to-vote correlation with optional context

### **Enhanced Analytics Capabilities**
- **Before**: Fragmented data requiring manual correlation
- **After**: Rich relationship data supporting advanced analytics

## 📋 **Breaking Changes**

### **1. trackTurn() Return Type**

#### **API Change**
```typescript
// v0.4.0 - Returns AI response directly
const response = await trackTurn(prompt, aiCall)

// v0.4.1 - Returns object with result + turnId
const { result, turnId } = await trackTurn(prompt, aiCall)
```

#### **Migration Pattern**
```typescript
// OLD v0.4.0 code:
const emailResponse = await trackTurn(
  'Write a professional email', 
  () => openai.chat.completions.create({...})
)
console.log(emailResponse.choices[0].message.content)

// NEW v0.4.1 code:
const { result: emailResponse, turnId } = await trackTurn(
  'Write a professional email',
  () => openai.chat.completions.create({...})
)
console.log(emailResponse.choices[0].message.content)
// turnId is now available for feedback correlation
```

### **2. vote() Parameter Changes**

#### **API Change**
```typescript
// v0.4.0 - Manual promptId creation
await vote(createPromptId('manual-id'), 1, 'Good')

// v0.4.1 - Use turnId from trackTurn
await vote(turnId, 1, 'Good')
```

#### **Migration Pattern**
```typescript
// OLD v0.4.0 pattern:
const response = await trackTurn('Help with code', aiCall)
// ... later in your code ...
await vote(createPromptId('code-help-123'), 1, 'Helpful!')

// NEW v0.4.1 pattern:
const { result: response, turnId } = await trackTurn('Help with code', aiCall)
// ... later in your code ...
await vote(turnId, 1, 'Helpful!')  // Automatic correlation!
```

### **3. Removed Exports**

#### **No Longer Available**
```typescript
// ❌ These exports are removed in v0.4.1:
import { createPromptId, PromptId } from '@mocksi/bilan-sdk'

// ✅ Use turnId from trackTurn instead:
const { result, turnId } = await trackTurn(...)
```

## 🔄 **Step-by-Step Migration**

### **Step 1: Update Package**

```bash
npm install @mocksi/bilan-sdk@^0.4.1
```

### **Step 2: Update trackTurn() Usage**

Find all `trackTurn()` calls and destructure the return value:

```typescript
// Search for this pattern:
const response = await trackTurn(

// Replace with:
const { result: response, turnId } = await trackTurn(
```

### **Step 3: Update vote() Usage**

Find all `vote()` calls and replace `promptId` with `turnId`:

```typescript
// Search for this pattern:
await vote(createPromptId('...'), value, comment)

// Replace with turnId from trackTurn:
await vote(turnId, value, comment)
```

### **Step 4: Remove Deprecated Imports**

```typescript
// Remove these imports:
import { createPromptId, PromptId } from '@mocksi/bilan-sdk'

// Keep these imports (unchanged):
import { init, trackTurn, vote, createUserId } from '@mocksi/bilan-sdk'
```

## 📊 **Common Migration Patterns**

### **Pattern 1: Basic AI Interaction**

```typescript
// ❌ v0.4.0 - Dual ID system
const response = await trackTurn(
  'Generate a summary',
  () => openai.chat.completions.create({...})
)
await vote(createPromptId('summary-123'), 1, 'Great summary!')

// ✅ v0.4.1 - Unified ID system
const { result: response, turnId } = await trackTurn(
  'Generate a summary',
  () => openai.chat.completions.create({...})
)
await vote(turnId, 1, 'Great summary!')
```

### **Pattern 2: Streamed Responses**

```typescript
// ❌ v0.4.0 - Manual correlation
const stream = await trackTurn(
  'Write a story',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...],
    stream: true
  })
)
// Manual tracking required for feedback
const manualId = createPromptId('story-' + Date.now())
await vote(manualId, 1, 'Engaging story!')

// ✅ v0.4.1 - Automatic correlation
const { result: stream, turnId } = await trackTurn(
  'Write a story',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [...], 
    stream: true
  })
)
// Automatic correlation with turnId
await vote(turnId, 1, 'Engaging story!')
```

### **Pattern 3: Context-Aware Interactions**

```typescript
// ❌ v0.4.0 - Limited context tracking
const response = await trackTurn(
  'Code review feedback',
  () => callAI(prompt),
  { context: 'code-review' }
)

// ✅ v0.4.1 - Rich context relationships
const { result: response, turnId } = await trackTurn(
  'Code review feedback',
  () => callAI(prompt),
  {
    journey_id: 'code-review-workflow',
    conversation_id: 'conv_123',
    turn_sequence: 2
  }
)
await vote(turnId, 1, 'Helpful review!')
```

### **Pattern 4: Error Handling**

```typescript
// ❌ v0.4.0 - Separate error tracking
try {
  const response = await trackTurn('Analyze data', aiCall)
  await vote(createPromptId('analysis'), 1, 'Good analysis')
} catch (error) {
  await vote(createPromptId('analysis'), -1, 'Failed to analyze')
}

// ✅ v0.4.1 - Correlated error tracking
let turnId: string
try {
  const { result: response, turnId: id } = await trackTurn('Analyze data', aiCall)
  turnId = id
  await vote(turnId, 1, 'Good analysis')
} catch (error) {
  if (turnId) {
    await vote(turnId, -1, 'Failed to analyze')
  }
}
```

## 🔍 **Validation Checklist**

After migration, verify:

- [ ] **Compilation**: TypeScript compilation succeeds without errors
- [ ] **Functionality**: All `trackTurn()` calls work with destructured return
- [ ] **Correlation**: Votes are properly linked to turns (check dashboard)
- [ ] **Context**: Optional context fields are captured correctly
- [ ] **Analytics**: Turn-to-vote correlation appears in analytics
- [ ] **Performance**: No regression in response times
- [ ] **Error Handling**: Error scenarios still work correctly

## 🆘 **Common Issues & Solutions**

### **Issue 1: TypeScript Errors**
```bash
Property 'choices' does not exist on type '{ result: any; turnId: string; }'
```
**Solution**: Destructure the return value properly
```typescript
// Wrong:
const response = await trackTurn(...)
console.log(response.choices)

// Correct:
const { result: response } = await trackTurn(...)
console.log(response.choices)
```

### **Issue 2: Missing turnId for votes**
```bash
Cannot find name 'createPromptId'
```
**Solution**: Use turnId from trackTurn instead
```typescript
// Wrong:
await vote(createPromptId('manual'), 1)

// Correct:
const { result, turnId } = await trackTurn(...)
await vote(turnId, 1)
```

### **Issue 3: Lost Response Data**
```bash
Response is undefined after trackTurn call
```
**Solution**: Access the result property
```typescript
// Wrong:
const response = await trackTurn(...)

// Correct:
const { result: response, turnId } = await trackTurn(...)
```

## 📈 **Benefits After Migration**

### **Developer Experience**
- **Cleaner Code**: No manual ID generation
- **Automatic Correlation**: System handles event relationships
- **Industry Familiarity**: Same patterns as Amplitude/Mixpanel
- **Type Safety**: Better TypeScript integration

### **Analytics Quality**
- **Direct Turn-Vote Correlation**: See which AI responses users liked
- **Context Relationships**: Optional journey/conversation tracking
- **Enhanced Insights**: Richer data for analytics queries
- **Performance Gains**: Optimized correlation queries

### **Data Integrity**
- **Consistent IDs**: System-generated IDs prevent duplicates
- **Relationship Tracking**: Proper foreign key relationships
- **Migration Safety**: Existing data automatically migrated
- **Rollback Support**: Can revert if needed

## 🔄 **Data Migration**

### **Automatic Migration**
- Existing vote events are automatically migrated
- `promptId` fields mapped to `turn_id` where possible
- No manual data migration required
- Zero downtime migration process

### **Migration Verification**
```typescript
// v0.4.1 includes migration validation
import { validateMigration } from '@mocksi/bilan-sdk/migration'

const result = await validateMigration()
console.log('Migration status:', result.isValid)
console.log('Migrated events:', result.migratedCount)
```

## 🚀 **New Capabilities**

### **Enhanced Context Tracking**
```typescript
const { result, turnId } = await trackTurn(
  'Review PR #123',
  () => callAI(prompt),
  {
    journey_id: 'code-review',
    conversation_id: 'pr-123-discussion',
    turn_sequence: 3,
    customData: { prId: 123, reviewer: 'alice' }
  }
)
```

### **Advanced Analytics Ready**
The new schema supports (but doesn't require):
- Frustration detection within conversations
- Journey completion analysis
- Cross-context performance insights
- Multi-turn conversation analysis

## 🆘 **Migration Support**

### **Resources**
- **Migration Script**: Automated code transformation
- **Validation Tool**: Check migration completeness
- **Rollback Plan**: Revert if issues arise
- **Documentation**: Updated examples and guides

### **Getting Help**
- **GitHub Issues**: Report migration problems
- **Discord Community**: Real-time migration support
- **Migration Guide**: This document with common patterns

---

**The v0.4.1 migration brings Bilan in line with industry standards while dramatically improving both developer experience and analytics capabilities.** The unified turn ID system provides the foundation for advanced AI analytics features while maintaining the simplicity that makes Bilan unique. 