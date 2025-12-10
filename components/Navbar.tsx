// components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFirebase } from "@/lib/firebase-context";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isDashboard = pathname === "/dashboard";
  const showTextLogo = isHomePage || isDashboard;
  const { isReady: firebaseReady } = useFirebase();

  useEffect(() => {
    // Only check Firebase auth state when Firebase is ready
    if (!firebaseReady) {
      // Firebase not ready yet - show logged out state
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    // Check Firebase auth state - only on client side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    async function checkAuthState() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (!mounted) return;
        
        // Only proceed if auth is available and valid
        if (auth && typeof auth === "object" && "currentUser" in auth) {
          // Use safe wrapper function
          unsubscribe = await onAuthStateChanged((user) => {
            if (mounted) {
              setIsLoggedIn(!!user);
              setLoading(false);
            }
          });
        } else {
          // Firebase not available or not configured - just show logged out state
          if (mounted) {
            setIsLoggedIn(false);
            setLoading(false);
          }
        }
      } catch (err: any) {
        // Silently handle errors - don't crash the page
        console.warn("[Navbar] Firebase auth check failed:", err?.message || err);
        if (mounted) {
          setIsLoggedIn(false);
          setLoading(false);
        }
      }
    }

    checkAuthState();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebaseReady]);

  useEffect(() => {
    // Smooth scrolling for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement;
      if (anchor && anchor.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const targetId = anchor.getAttribute('href')?.slice(1);
        const targetElement = document.getElementById(targetId || '');
        if (targetElement) {
          const offsetTop = targetElement.offsetTop - 80; // Account for sticky navbar
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
          // Close mobile menu after clicking
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      const { signOut } = await import("@/lib/firebase");
      await signOut();
      router.push("/");
      router.refresh();
    } catch (err: any) {
      // Handle error - Firebase might not be configured
      console.warn("[Navbar] Logout failed:", err?.message || err);
      // Still redirect to home page
      router.push("/");
      router.refresh();
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo" style={{ display: "flex", alignItems: "center", textDecoration: "none", height: "40px" }}>
          {showTextLogo ? (
            <span style={{ 
              fontSize: "1.5rem", 
              fontWeight: "700", 
              color: "var(--text-dark)",
              letterSpacing: "0.02em"
            }}>
          Bin Blast Co.
            </span>
          ) : (
            <div style={{ 
              width: "100px", 
              height: "40px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "flex-start", 
              overflow: "hidden", 
              position: "relative",
              padding: "2px 0"
            }}>
              <Image 
                src="/logo.png" 
                alt="Bin Blast Co. Logo" 
                width={100} 
                height={40}
                style={{ 
                  objectFit: "contain", 
                  objectPosition: "left center", 
                  width: "auto", 
                  height: "100%",
                  maxWidth: "100%"
                }}
                priority
              />
            </div>
          )}
        </Link>
        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <li>
            {isLoggedIn ? (
              <Link href="/">Home</Link>
            ) : (
              <Link href="#home">Home</Link>
            )}
          </li>
          <li>
            {isLoggedIn ? (
              <Link href="/#pricing">Services</Link>
            ) : (
              <Link href="#pricing">Services</Link>
            )}
          </li>
          <li>
            {isLoggedIn ? (
              <Link href="/dashboard">Account</Link>
            ) : (
              <Link href="#account">Account</Link>
            )}
          </li>
          {!loading && (
            <li>
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-dark)",
                    fontWeight: "500",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "inherit",
                    fontFamily: "inherit",
                    transition: "color 0.3s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--primary-color)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-dark)";
                  }}
                >
                  Logout
                </button>
              ) : (
                <Link href="/login">Login</Link>
              )}
            </li>
          )}
          <li>
            <Link href="#pricing" className="nav-login">Get Started</Link>
          </li>
        </ul>
        <button className="nav-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}

