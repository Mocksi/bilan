# @mocksi/bilan-sdk

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-sdk?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-sdk)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-1.7KB%20gzipped-brightgreen?style=flat-square)](https://github.com/Mocksi/bilan/tree/main/packages/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**TypeScript SDK for Bilan trust analytics** - Track user feedback on AI suggestions. Self-hostable, TypeScript-first, <2KB bundle.

## Quick Start

```bash
npm install @mocksi/bilan-sdk
```

```typescript
import { init, vote, getStats, createUserId, createPromptId } from '@mocksi/bilan-sdk'

// Initialize the SDK
await init({
  mode: 'local',  // or 'server' for self-hosted API
  userId: createUserId('user-123')
})

// Track user feedback
await vote(createPromptId('prompt-abc'), 1, 'Helpful suggestion!')

// Get analytics
const stats = await getStats()
console.log(`Trust score: ${(stats.positiveRate * 100).toFixed(1)}%`)
console.log(`Trend: ${stats.recentTrend}`) // 'improving' | 'declining' | 'stable'
```

## Features

- **🚀 Lightweight**: 1.7KB gzipped bundle size
- **🔒 Type Safe**: Full TypeScript support with branded types
- **🏃‍♂️ Zero Dependencies**: Uses only native web APIs
- **📱 Universal**: Works in browsers, Node.js, and edge environments
- **🔧 Configurable**: Advanced trend analysis with customizable parameters
- **🛡️ Robust**: Comprehensive error handling and graceful degradation

## Documentation

For complete documentation, examples, and self-hosting instructions, visit:
**[https://github.com/Mocksi/bilan](https://github.com/Mocksi/bilan)**

## License

MIT © [Mocksi](https://github.com/Mocksi) 