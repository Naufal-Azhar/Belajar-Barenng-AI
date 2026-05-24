'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Root error boundary untuk catch React render errors yang tidak ter-handle.
 * Lebih untuk safety net — error per-fitur di-handle via per-komponen error state.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log untuk debugging — di production bisa kirim ke service
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
            <h1 className="text-display-sm font-serif text-ink mb-2">Aduh, ada masalah</h1>
            <p className="text-body-md text-muted mb-6 text-center max-w-md">
              Aplikasi mengalami error tak terduga. Coba refresh halaman, kalau masih bermasalah lapor ke developer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={this.reset}
                className="rounded-md border border-hairline px-4 py-2 text-body-sm hover:bg-surface transition-colors"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="rounded-md bg-primary text-white px-4 py-2 text-body-sm hover:bg-primary/90 transition-colors"
              >
                Ke Beranda
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-xs text-muted-soft max-w-2xl w-full">
                <summary className="cursor-pointer">Detail error (dev only)</summary>
                <pre className="mt-2 p-3 bg-surface rounded overflow-auto">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}
