# Migration Guide: v0.4.1 → v0.4.2

## Overview

Bilan v0.4.2 is a **critical patch release** that fixes a major bug in server mode where events were never actually sent to the analytics server. This guide helps you migrate from v0.4.1 to v0.4.2.

## 🚨 **Critical Fix**

**v0.4.1 Server Mode was Broken**: In v0.4.1, server mode appeared to work but events were silently dropped - no HTTP requests were made to the analytics server.

**v0.4.2 Fixes This**: Server mode now properly sends events with required API key authentication.

## 📋 **Breaking Changes**

### **Required API Key for Server Mode**

Server mode now requires the `apiKey` parameter for authentication.

```typescript
// ❌ v0.4.1 (BROKEN - no events sent)
await init({
  mode: 'server',
  endpoint: 'https://your-server.com',
  userId: 'user-123'
  // Missing apiKey - events were silently dropped
})

// ✅ v0.4.2 (WORKING - events properly sent)
await init({
  mode: 'server',
  endpoint: 'https://your-server.com',
  apiKey: 'your-secure-api-key',  // NEW: Required
  userId: 'user-123'
})
```

## 🛠️ **Migration Steps**

### **1. Update SDK Version**

```bash
npm update @mocksi/bilan-sdk@^0.4.2
```

### **2. Add API Key to Server Mode Configuration**

**For Environment Variables:**
```bash
# Add to your .env file
BILAN_API_KEY=your-secure-api-key-here
```

**For Direct Configuration:**
```typescript
await init({
  mode: 'server',
  endpoint: process.env.BILAN_ENDPOINT,
  apiKey: process.env.BILAN_API_KEY,  // Add this line
  userId: 'your-user-id'
})
```

**For Next.js Applications:**
```typescript
// pages/api/ai-chat.js or app/api/ai-chat/route.js
await init({
  mode: 'server',
  endpoint: process.env.BILAN_ENDPOINT,
  apiKey: process.env.BILAN_API_KEY,  // Required for server mode
  userId: 'server-user'
})
```

### **3. Verify Server Configuration**

Ensure your Bilan server has the matching API key:

```bash
# Server environment variable must match SDK apiKey
export BILAN_API_KEY=your-secure-api-key-here

# Or for development
export BILAN_DEV_MODE=true  # Allows missing API key
```

### **4. Test the Fix**

```typescript
await init({
  mode: 'server',
  endpoint: 'https://your-server.com',
  apiKey: 'your-secure-api-key',
  debug: true  // Enable debug logging
})

const { result, turnId } = await trackTurn('test prompt', async () => {
  return 'test response'
})

// Check browser network tab or console for HTTP requests to /api/events
// Should see successful POST requests in v0.4.2
```

## 📊 **Bundle Size Impact**

- **Before (v0.4.1)**: <5.0KB gzipped
- **After (v0.4.2)**: 5.26KB gzipped (+268 bytes)

The size increase is necessary to add the HTTP functionality that was missing in v0.4.1.

## 🔍 **How to Verify Migration Success**

### **Check Events Are Being Sent**

```typescript
await init({
  mode: 'server',
  endpoint: 'https://your-server.com',
  apiKey: 'your-api-key',
  debug: true  // This will log HTTP requests
})

// Look for console messages like:
// "Bilan: 1" (indicating 1 event was sent)
```

### **Check Server Logs**

```bash
# Your Bilan server should log incoming events:
[INFO] POST /api/events - 1 events received
```

### **Check Browser Network Tab**

- Open browser developer tools
- Go to Network tab
- Perform AI interactions
- Look for successful POST requests to `/api/events`

## ⚠️ **Common Migration Issues**

### **"Missing API Key" Error**

```
Error: Server mode requires apiKey parameter
```

**Solution**: Add the `apiKey` parameter to your `init()` call.

### **"401 Unauthorized" Error**

```
Bilan: 401
```

**Solution**: Ensure your SDK `apiKey` matches your server's `BILAN_API_KEY`.

### **"Events Not Appearing in Dashboard"**

**Check:**
1. Server is running and accessible
2. API key matches between SDK and server
3. No CORS errors in browser console
4. Server logs show incoming events

## 📚 **Documentation Updates**

All integration guides have been updated for v0.4.2:

- [OpenAI Integration](./docs/integrations/openai-api.md)
- [Anthropic Integration](./docs/integrations/anthropic-api.md)
- [LangChain Integration](./docs/integrations/langchain.md)
- [Vercel AI SDK Integration](./docs/integrations/vercel-ai-sdk.md)
- [CopilotKit Integration](./docs/integrations/copilotkit.md)

## 🎯 **Local Mode Unchanged**

If you're using local mode, no changes are required:

```typescript
// ✅ Works the same in v0.4.1 and v0.4.2
await init({
  mode: 'local',
  userId: 'user-123'
})
```

## 🚀 **Next Steps**

After migrating to v0.4.2:

1. **Verify Events**: Check that events are appearing in your analytics server
2. **Monitor Performance**: The +268 byte bundle increase is justified for working functionality
3. **Update Documentation**: Update any internal docs that reference server mode setup
4. **Security Review**: Ensure API keys are properly secured in your deployment

---

**This migration is essential for anyone using server mode. v0.4.1 server mode was completely non-functional, making this a critical security and functionality fix.** 