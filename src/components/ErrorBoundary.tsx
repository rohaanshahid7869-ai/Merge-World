import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('App ErrorBoundary caught error:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-screen bg-[#0b2017] text-white flex items-center justify-center p-6">
          <div className="bg-[#faf8f3] text-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border-2 border-[#d6cbb5] text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-emerald-950">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 break-words">
                Your local sanctuary progress is safe. Reload to continue playing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Merge World</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
