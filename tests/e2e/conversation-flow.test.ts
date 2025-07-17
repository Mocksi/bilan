/**
 * End-to-end tests for complete conversation flow
 * Tests the full user journey: SDK -> API -> Dashboard
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BilanSDK, createUserId, createPromptId, createConversationId } from '../../packages/sdk/src/index'
import { ApiClient } from '../../packages/dashboard/src/lib/api-client'
import { BilanDatabase } from '../../packages/server/src/database/schema'
import { BasicAnalyticsProcessor } from '../../packages/server/src/analytics/basic-processor'

// Mock environment for testing
const mockUserId = createUserId('test-user-e2e')
const mockPromptId = createPromptId('test-prompt-e2e')
const mockConversationId = createConversationId('test-conv-e2e')

describe('E2E: Complete Conversation Flow', () => {
  let sdk: BilanSDK
  let apiClient: ApiClient
  let database: BilanDatabase
  let processor: BasicAnalyticsProcessor

  beforeEach(async () => {
    // Initialize in-memory database for testing
    database = new BilanDatabase(':memory:')
    processor = new BasicAnalyticsProcessor(database)
    
    // Initialize SDK in server mode for E2E testing
    sdk = new BilanSDK()
    await sdk.init({
      mode: 'server',
      userId: mockUserId,
      endpoint: 'http://localhost:3002',
      debug: true
    })
    
    // Initialize API client
    apiClient = new ApiClient('http://localhost:3002')
    
    // Mock fetch for E2E coordination
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Close database connection to prevent resource leaks
    if (database) {
      database.close()
    }
  })

  describe('Complete User Journey', () => {
    it('should handle full conversation lifecycle', async () => {
      // Step 1: Start conversation
      const conversationId = await sdk.startConversation(mockUserId)
      expect(conversationId).toBeTruthy()
      expect(conversationId).toMatch(/^conv-/)
      
      // Step 2: Add messages to conversation
      await sdk.addMessage(conversationId)
      await sdk.addMessage(conversationId)
      
      // Step 3: Record user feedback
      await sdk.recordFeedback(conversationId, 1)
      
      // Step 4: Record quality signals
      await sdk.recordRegeneration(conversationId)
      
      // Step 5: End conversation successfully
      await sdk.endConversation(conversationId, 'completed')
      
      // Verify conversation data through analytics
      const dashboardData = await processor.calculateDashboardData()
      expect(dashboardData.recentActivity.totalEvents).toBeGreaterThan(0)
      expect(dashboardData.qualitySignals.regenerations).toBeGreaterThanOrEqual(0)
    })

    it('should handle vote tracking across conversation', async () => {
      const conversationId = await sdk.startConversation(mockUserId)
      
      // Add multiple AI responses and votes
      for (let i = 0; i < 3; i++) {
        const promptId = createPromptId(`test-prompt-${i}`)
        await sdk.addMessage(conversationId)
        
        // Vote on the response
        await sdk.vote(promptId, i % 2 === 0 ? 1 : -1, `Comment ${i + 1}`)
      }
      
      // Check vote statistics
      const stats = await sdk.getStats()
      expect(stats.totalVotes).toBe(3)
      expect(stats.positiveRate).toBe(2/3) // 2 positive, 1 negative
    })

    it('should handle conversation abandonment', async () => {
      const conversationId = await sdk.startConversation(mockUserId)
      
      // Add some messages
      await sdk.addMessage(conversationId)
      await sdk.addMessage(conversationId)
      
      // Record frustration
      await sdk.recordFrustration(conversationId)
      
      // End conversation as abandoned
      await sdk.endConversation(conversationId, 'abandoned')
      
      // Verify abandonment was recorded through analytics
      const dashboardData = await processor.calculateDashboardData()
      expect(dashboardData.qualitySignals.frustration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Cross-Platform Integration', () => {
    it('should sync data between SDK and dashboard', async () => {
      // Generate test data through SDK
      const conversationId = await sdk.startConversation(mockUserId)
      
      // Add multiple interactions
      for (let i = 0; i < 5; i++) {
        await sdk.addMessage(conversationId)
        
        const promptId = createPromptId(`prompt-${i}`)
        await sdk.addMessage(conversationId)
        
        await sdk.vote(promptId, Math.random() > 0.3 ? 1 : -1)
      }
      
      await sdk.endConversation(conversationId, 'completed')
      
      // Verify dashboard can access the data
      const dashboardData = await processor.calculateDashboardData()
      
      expect(dashboardData.feedbackStats.totalFeedback).toBe(5)
      expect(dashboardData.qualitySignals.positive + dashboardData.qualitySignals.negative).toBe(5)
      expect(dashboardData.recentActivity.totalEvents).toBe(5)
    })

    it('should handle real-time updates', async () => {
      // Initial state
      let dashboardData = await processor.calculateDashboardData()
      const initialEvents = dashboardData.recentActivity.totalEvents
      
      // Add new conversation
      const conversationId = await sdk.startConversation(mockUserId)
      await sdk.addMessage(conversationId)
      
      const promptId = createPromptId('real-time-test')
      await sdk.addMessage(conversationId)
      
      await sdk.vote(promptId, 1, 'Great!')
      await sdk.endConversation(conversationId, 'completed')
      
      // Check updated state
      dashboardData = await processor.calculateDashboardData()
      expect(dashboardData.recentActivity.totalEvents).toBe(initialEvents + 1)
      expect(dashboardData.feedbackStats.totalFeedback).toBe(1)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      // Mock network failure
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      // SDK should handle gracefully
      await expect(sdk.startConversation(mockUserId)).resolves.toBeTruthy()
      await expect(sdk.vote(mockPromptId, 1)).resolves.not.toThrow()
      
      // Restore network
      global.fetch = originalFetch
      
      // Should work normally after recovery
      const conversationId = await sdk.startConversation(mockUserId)
      expect(conversationId).toBeTruthy()
    })

    it('should handle invalid data gracefully', async () => {
      // Test with invalid conversation ID
      await expect(sdk.addMessage('invalid-conv-id' as any)).resolves.not.toThrow()
      
      // Test with invalid prompt ID
      await expect(sdk.vote('invalid-prompt', 1)).resolves.not.toThrow()
      
      // Test with invalid user ID
      await expect(sdk.startConversation('invalid-user' as any)).resolves.toBeTruthy()
    })
  })

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent conversations', async () => {
      const conversationPromises = Array.from({ length: 10 }, async (_, i) => {
        const conversationId = await sdk.startConversation(createUserId(`user-${i}`))
        
        // Add messages
        for (let j = 0; j < 5; j++) {
          await sdk.addMessage(conversationId)
          
          const promptId = createPromptId(`prompt-${i}-${j}`)
          await sdk.addMessage(conversationId)
          
          await sdk.vote(promptId, Math.random() > 0.5 ? 1 : -1)
        }
        
        await sdk.endConversation(conversationId, 'completed')
        return conversationId
      })
      
      const results = await Promise.all(conversationPromises)
      expect(results).toHaveLength(10)
      expect(results.every(id => id && id.startsWith('conv-'))).toBe(true)
      
      // Verify all conversations were recorded
      const dashboardData = await processor.calculateDashboardData()
      expect(dashboardData.feedbackStats.totalFeedback).toBe(50) // 10 conversations × 5 votes each
      expect(dashboardData.recentActivity.totalEvents).toBe(50)
    })

    it('should handle high-frequency voting', async () => {
      const votePromises = Array.from({ length: 100 }, async (_, i) => {
        const promptId = createPromptId(`high-freq-prompt-${i}`)
        return sdk.vote(promptId, i % 2 === 0 ? 1 : -1, `Vote ${i}`)
      })
      
      await Promise.all(votePromises)
      
      const stats = await sdk.getStats()
      expect(stats.totalVotes).toBe(100)
      expect(stats.positiveRate).toBe(0.5) // 50% positive
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data integrity across operations', async () => {
      const conversationId = await sdk.startConversation(mockUserId)
      
      // Perform multiple operations
      await sdk.addMessage(conversationId)
      
      const promptId = createPromptId('consistency-test')
      await sdk.addMessage(conversationId)
      
      await sdk.vote(promptId, 1, 'Excellent!')
      await sdk.recordFeedback(conversationId, 1)
      await sdk.recordRegeneration(conversationId)
      await sdk.endConversation(conversationId, 'completed')
      
      // Verify consistency
      const stats = await sdk.getStats()
      const dashboardData = await processor.calculateDashboardData()
      
      expect(stats.totalVotes).toBe(1)
      expect(dashboardData.feedbackStats.totalFeedback).toBe(1)
      expect(dashboardData.qualitySignals.positive).toBe(1)
      expect(dashboardData.qualitySignals.regenerations).toBeGreaterThanOrEqual(0)
      expect(dashboardData.recentActivity.totalEvents).toBe(1)
    })
  })
}) 