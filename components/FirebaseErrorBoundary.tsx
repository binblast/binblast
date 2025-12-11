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
    // Check if this is a Firebase initialization error
    const isFirebaseError = 
      error?.message?.includes("apiKey") ||
      error?.message?.includes("authenticator") ||
      error?.message?.includes("Firebase");
    
    if (isFirebaseError) {
      console.warn("[FirebaseErrorBoundary] Caught Firebase error - allowing site to render:", error?.message);
      // Don't show error UI for Firebase errors - just log and continue
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error: error || null };
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

