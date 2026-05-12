// React 렌더링 오류를 잡아 PostHog에 보고하고 fallback UI를 표시하는 에러 바운더리
"use client";

import posthog from "posthog-js";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    posthog.captureException(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-white p-6 text-center">
          <h1 className="text-[20px] font-bold text-[var(--gray-900)]">
            잠시 문제가 발생했어요
          </h1>
          <p className="mt-2 text-[13px] text-[var(--gray-500)] max-w-[320px]">
            {this.state.error.message || "알 수 없는 오류"}
          </p>
          <button
            onClick={this.reset}
            className="mt-6 rounded-xl bg-[var(--blue-primary)] px-6 py-3 text-[14px] font-bold text-white"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
