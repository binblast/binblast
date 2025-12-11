// components/FirebaseErrorBoundary.tsx
// Error boundary to catch Firebase initialization errors and allow site to render
"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FirebaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // With the unified Firebase client, initialization errors should not occur
    // If they do, it's a genuine error that should be logged
    const errorMsg = error?.message || String(error);
    
    // Log all errors for debugging
    console.error("[FirebaseErrorBoundary] Error caught:", errorMsg);
    
    // Allow site to render for all errors - don't block the UI
    // Components will handle Firebase unavailability gracefully
    return { hasError: false, error: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error but don't block rendering
    console.error("[FirebaseErrorBoundary] Error caught:", error, errorInfo);
  }

  render() {
    // Always render children - don't block site even if Firebase fails
    return this.props.children;
  }
}

