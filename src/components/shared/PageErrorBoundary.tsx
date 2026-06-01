import { Component, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface State {
  error: Error | null;
  pathname: string;
}

interface Props {
  children: ReactNode;
  pathname: string;
}

class Boundary extends Component<Props, State> {
  state: State = { error: null, pathname: this.props.pathname };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.pathname !== state.pathname) {
      return { pathname: props.pathname, error: null };
    }
    return null;
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // eslint-disable-next-line no-console
    console.error('[Probr] page crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card p-6 border-data-red/40 bg-data-red/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-data-red mt-0.5" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-data-red">This tool crashed while rendering.</h2>
              <p className="text-sm text-slate-400 mt-1">
                The API response likely didn't match the shape we expected. The rest of Probr is still
                working — pick another tool from the sidebar, or try the same tool with a different input.
              </p>
              <pre className="mono text-xs text-slate-400 mt-3 bg-surface-900/60 border border-surface-700 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.error.stack ?? this.state.error.message}
              </pre>
              <button
                onClick={() => this.setState({ error: null })}
                className="mt-3 px-3 py-1.5 text-xs bg-brand-500 hover:bg-brand-400 text-white rounded"
              >
                Retry render
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return <Boundary pathname={loc.pathname}>{children}</Boundary>;
}
