'use client'
import { useEffect, useState } from 'react'
import { init, vote, getStats, BasicStats, createUserId } from '@mocksi/bilan-sdk'

export default function Example() {
  const [stats, setStats] = useState<BasicStats | null>(null)
  const [suggestions] = useState([
    { 
      id: 'prompt-1', 
      text: 'You should try our new AI writing assistant!',
      promptText: 'What tools can help me write better content?',
      aiOutput: 'You should try our new AI writing assistant! It can help you create engaging content, fix grammar, and improve your writing style.'
    },
    { 
      id: 'prompt-2', 
      text: 'Based on your history, here are some recommendations...',
      promptText: 'Can you suggest products based on my previous purchases?',
      aiOutput: 'Based on your history, here are some recommendations: wireless headphones, portable chargers, and productivity apps that complement your tech lifestyle.'
    },
    { 
      id: 'prompt-3', 
      text: 'Would you like me to help you optimize this code?',
      promptText: 'How can I make this React component more efficient?',
      aiOutput: 'Would you like me to help you optimize this code? I can suggest using React.memo, useCallback, and splitting large components into smaller ones.'
    }
  ])

  useEffect(() => {
    init({
      mode: 'server',
      endpoint: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002',
      userId: createUserId('demo-user'),
      debug: true
    }).then(refreshStats)
  }, [])

  const refreshStats = async () => {
    const newStats = await getStats()
    setStats(newStats)
  }

  const handleVote = async (promptId: string, value: 1 | -1) => {
    const suggestion = suggestions.find(s => s.id === promptId)
    await vote(promptId, value, undefined, {
      promptText: suggestion?.promptText,
      aiOutput: suggestion?.aiOutput,
      modelUsed: 'gpt-4',
      responseTime: Math.random() * 2 + 0.5 // Simulate response time
    })
    await refreshStats()
  }

  return (
    <div className="max-w-4xl mx-auto p-8" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 className="text-3xl font-bold mb-8" style={{ fontSize: '2rem', marginBottom: '2rem' }}>
        Bilan SDK Example
      </h1>
      
      {stats && (
        <div style={{
          backgroundColor: '#dbeafe',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Your Stats
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                {stats.totalVotes}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Votes</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>
                {(stats.positiveRate * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Positive Rate</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                marginBottom: '0.5rem'
              }}>
                <strong>User Question:</strong> {suggestion.promptText}
              </div>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '0.75rem',
                borderRadius: '0.25rem'
              }}>
                <strong>AI Response:</strong> {suggestion.aiOutput}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleVote(suggestion.id, 1)}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
              >
                👍 Helpful
              </button>
              <button
                onClick={() => handleVote(suggestion.id, -1)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                👎 Not helpful
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 