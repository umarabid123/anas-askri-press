import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled application error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-full flex items-center justify-center p-6 bg-[#EEF4F8]">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertCircle className="w-7 h-7 stroke-[2]" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Something went wrong
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-normal">
              An unexpected error occurred. Please reload the application.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-auto max-h-32 text-[11px] font-mono text-slate-700">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-6">
              <Button
                type="button"
                variant="primary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4 stroke-[2.2]" />}
                className="w-full"
              >
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
