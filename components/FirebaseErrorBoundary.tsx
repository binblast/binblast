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
    // After fixing initialization, Firebase errors should not occur
    // But if they do, log them for debugging
    const errorMsg = error?.message || String(error);
    
    // Check if this is a Firebase initialization error
    // These should NOT happen after proper initialization
    const isFirebaseInitError = 
      errorMsg.includes("apiKey") ||
      errorMsg.includes("authenticator");
    
    if (isFirebaseInitError) {
      // This should not happen - log as error for debugging
      console.error("[FirebaseErrorBoundary] ❌ Firebase initialization error (this should not happen):", errorMsg);
      console.error("[FirebaseErrorBoundary] This indicates Firebase modules were imported before app initialization completed");
      // Still allow site to render, but log as error
      return { hasError: false, error: null };
    }
    
    // Other Firebase errors (not initialization) - allow site to render
    if (errorMsg.includes("Firebase")) {
      console.warn("[FirebaseErrorBoundary] Caught Firebase runtime error - allowing site to render:", errorMsg);
      return { hasError: false, error: null };
    }
    
    // Non-Firebase errors - show error UI
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

