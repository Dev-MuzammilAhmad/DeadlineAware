import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-bg-surface border border-border-main p-8 rounded-2xl shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-danger-main/10 border border-danger-main/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-danger-main">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text-main">Something went wrong</h2>
              <p className="text-sm text-text-sub leading-relaxed">
                An unexpected error occurred in the application. We apologize for the inconvenience.
              </p>
            </div>

            {this.state.error && (
              <pre className="text-left bg-bg-base border border-border-main/50 p-4 rounded-xl text-xs text-text-sub font-mono overflow-auto max-h-40">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-opacity-90 transition cursor-pointer shadow-sm shadow-primary/10"
            >
              <RotateCcw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
