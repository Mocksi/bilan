'use client'
import { useState, useEffect } from 'react'
import { logger } from '../lib/logger'

interface Event {
  promptId: string
  value: number
  comment?: string
  timestamp: number
  userId: string
  metadata?: any
  promptText?: string
  aiOutput?: string
  modelUsed?: string
  responseTime?: number
}

interface UserStats {
  totalVotes: number
  positiveRate: number
  recentTrend: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface EventsResponse {
  events: Event[]
  total: number
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get API base URL from environment variables
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/api/events?limit=50`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: EventsResponse = await response.json()
      setEvents(data.events || [])
      logger.log('Events fetched successfully', data.events?.length || 0)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to fetch events: ${errorMessage}`)
      logger.error('Error fetching events', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async (userId: string) => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/api/stats?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: UserStats = await response.json()
      setUserStats(data)
      logger.log('User stats fetched', { userId, totalVotes: data.totalVotes })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to fetch user stats: ${errorMessage}`)
      logger.error('Error fetching user stats', { error: errorMessage, userId })
    }
  }

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId)
    fetchUserStats(userId)
  }

  const clearSelection = () => {
    setSelectedUserId(null)
    setUserStats(null)
    setError(null)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getVoteText = (value: number) => {
    return value > 0 ? '👍 Positive' : '👎 Negative'
  }

  const getVoteColor = (value: number) => {
    return value > 0 ? 'green' : 'red'
  }

  const truncateText = (text: string | undefined, maxLength: number = 100) => {
    if (!text) return '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const retryFetch = () => {
    setError(null)
    setLoading(true)
    fetchEvents()
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Bilan Analytics - Loading...</h1>
      </div>
    )
  }

  if (error && events.length === 0) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#721c24', marginBottom: '10px' }}>Error Loading Dashboard</h2>
          <p style={{ color: '#721c24', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={retryFetch}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #f8f9fa', paddingBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#212529', fontSize: '28px' }}>Bilan Analytics</h1>
        <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '16px' }}>
          Trust analytics and user feedback insights for your AI-powered application
        </p>
      </div>

      {error && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          color: '#721c24'
        }}>
          <strong>Warning:</strong> {error}
          <button
            onClick={retryFetch}
            style={{
              marginLeft: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              padding: '5px 10px',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {selectedUserId && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f0f8ff', 
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}>
          <h2>User Details: {selectedUserId}</h2>
          {userStats && (
            <div>
              <p><strong>Total Votes:</strong> {userStats.totalVotes}</p>
              <p><strong>Positive Rate:</strong> {(userStats.positiveRate * 100).toFixed(1)}%</p>
              <p><strong>Trend:</strong> {userStats.recentTrend}</p>
            </div>
          )}
          <button 
            onClick={clearSelection}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to All Events
          </button>
        </div>
      )}

      <div style={{ marginBottom: '25px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e9ecef', 
            borderRadius: '8px', 
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>
              {events.length}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Events</div>
          </div>
          <div style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e9ecef', 
            borderRadius: '8px', 
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745', marginBottom: '5px' }}>
              {events.filter(e => e.value > 0).length}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Positive Votes</div>
          </div>
          <div style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e9ecef', 
            borderRadius: '8px', 
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545', marginBottom: '5px' }}>
              {events.filter(e => e.value < 0).length}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Negative Votes</div>
          </div>
          <div style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e9ecef', 
            borderRadius: '8px', 
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1', marginBottom: '5px' }}>
              {new Set(events.map(e => e.userId)).size}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Unique Users</div>
          </div>
        </div>
      </div>

      <h2 style={{ color: '#212529', marginBottom: '15px' }}>Recent Events</h2>
      
      {events.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#6c757d', marginBottom: '10px' }}>No Events Yet</h3>
          <p style={{ color: '#6c757d', margin: 0 }}>
            Once your application starts sending events to the Bilan SDK, they'll appear here.
          </p>
        </div>
      ) : (
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#fff'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '15px 12px', border: '1px solid #e9ecef', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                User ID
              </th>
              <th style={{ padding: '15px 12px', border: '1px solid #e9ecef', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Prompt Text
              </th>
              <th style={{ padding: '15px 12px', border: '1px solid #e9ecef', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                AI Output
              </th>
              <th style={{ padding: '15px 12px', border: '1px solid #e9ecef', textAlign: 'center', fontWeight: '600', color: '#495057' }}>
                Vote
              </th>
              <th style={{ padding: '15px 12px', border: '1px solid #e9ecef', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Model
              </th>
              <th style={{ padding: '15px 12px', border: '1px solid #e9ecef', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Comment
              </th>
              <th style={{ padding: '15px 12px', border: '1px solid #e9ecef', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={index} style={{ 
                backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                borderBottom: '1px solid #e9ecef',
                ...(selectedUserId && selectedUserId !== event.userId ? { opacity: 0.3 } : {})
              }}>
                <td style={{ padding: '15px 12px', border: '1px solid #e9ecef' }}>
                  <button
                    onClick={() => handleUserClick(event.userId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#007bff',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {event.userId}
                  </button>
                </td>
                <td style={{ padding: '15px 12px', border: '1px solid #e9ecef', fontSize: '13px', color: '#495057' }}>
                  {truncateText(event.promptText)}
                </td>
                <td style={{ padding: '15px 12px', border: '1px solid #e9ecef', fontSize: '13px', color: '#495057' }}>
                  {truncateText(event.aiOutput)}
                </td>
                <td style={{ 
                  padding: '15px 12px', 
                  border: '1px solid #e9ecef', 
                  textAlign: 'center',
                  color: getVoteColor(event.value),
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  {getVoteText(event.value)}
                </td>
                <td style={{ padding: '15px 12px', border: '1px solid #e9ecef', fontSize: '13px', color: '#6c757d' }}>
                  {event.modelUsed || '-'}
                </td>
                <td style={{ padding: '15px 12px', border: '1px solid #e9ecef', fontSize: '13px', color: '#495057' }}>
                  {event.comment || '-'}
                </td>
                <td style={{ padding: '15px 12px', border: '1px solid #e9ecef', fontSize: '12px', color: '#6c757d' }}>
                  {formatTimestamp(event.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <div style={{ marginTop: '30px', fontSize: '12px', color: '#6c757d', borderTop: '1px solid #e9ecef', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0 }}>
              <strong>💡 Tip:</strong> Click on any User ID to view detailed analytics for that user
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, color: '#28a745' }}>
              ● Active ({events.length} events loaded)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 