import { Component } from 'react';
import { Logo } from '@/components/Logo';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
          <Logo />
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">
              Something went off-track.
            </h1>
            <p className="mt-2 max-w-sm text-sm text-ink/60">
              An unexpected error occurred. Reload the page to get back to base camp.
            </p>
          </div>
          <button
            data-testid="error-reload-button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-ink-700"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
