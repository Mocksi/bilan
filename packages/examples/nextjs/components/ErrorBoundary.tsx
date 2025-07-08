'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f9f9f9',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '1rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#dc3545', fontWeight: 'bold' }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.875rem', 
                  color: '#dc3545',
                  backgroundColor: '#ffebee',
                  padding: '1rem',
                  borderRadius: '4px',
                  overflow: 'auto'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 