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
  const [accountUrl, setAccountUrl] = useState("/dashboard");
  const [isEmployee, setIsEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isDashboard = pathname === "/dashboard" || pathname === "/partners/dashboard" || pathname === "/employee/dashboard";
  const showTextLogo = isHomePage || isDashboard;
  const { isReady: firebaseReady } = useFirebase();

  useEffect(() => {
    // Check Firebase auth state - only on client side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500; // 500ms between retries

    async function checkAuthState() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (!mounted) return;
        
          // Only proceed if auth is available and valid
        if (auth && typeof auth === "object" && "currentUser" in auth) {
          // Check current user immediately
          if (auth.currentUser && mounted) {
            setIsLoggedIn(true);
              
              // Update account URL based on partner/employee status
              try {
                const { getDbInstance } = await import("@/lib/firebase");
                const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
                const db = await getDbInstance();
                
                if (db) {
                  const firestore = await safeImportFirestore();
                  const { doc, getDoc } = firestore;
                  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                  
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.role === "employee") {
                      setIsEmployee(true);
                      setAccountUrl("/employee/dashboard");
                    } else {
                      setIsEmployee(false);
                      const { getDashboardUrl } = await import("@/lib/partner-auth");
                      const dashboardUrl = await getDashboardUrl(auth.currentUser.uid);
                      setAccountUrl(dashboardUrl);
                    }
                  } else {
                    setIsEmployee(false);
                    setAccountUrl("/dashboard");
                  }
                } else {
                  setIsEmployee(false);
                  setAccountUrl("/dashboard");
                }
              } catch (err) {
                console.error("[Navbar] Error getting dashboard URL:", err);
                setIsEmployee(false);
                setAccountUrl("/dashboard");
              }
              
            setLoading(false);
            console.log("[Navbar] User is logged in:", auth.currentUser.email);
          } else if (mounted) {
            setIsLoggedIn(false);
            setIsEmployee(false);
              setAccountUrl("/dashboard");
            setLoading(false);
            console.log("[Navbar] No user logged in");
          }
          
          // Use safe wrapper function to listen for changes
          unsubscribe = await onAuthStateChanged(async (user) => {
            if (mounted) {
              setIsLoggedIn(!!user);
              
              // Update account URL based on partner/employee status
              if (user) {
                try {
                  // Check if user is an employee
                  const { getDbInstance } = await import("@/lib/firebase");
                  const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
                  const db = await getDbInstance();
                  
                  if (db) {
                    const firestore = await safeImportFirestore();
                    const { doc, getDoc } = firestore;
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    
                    if (userDoc.exists()) {
                      const userData = userDoc.data();
                      if (userData.role === "employee") {
                        setIsEmployee(true);
                        setAccountUrl("/employee/dashboard");
                      } else {
                        setIsEmployee(false);
                        const { getDashboardUrl } = await import("@/lib/partner-auth");
                        const dashboardUrl = await getDashboardUrl(user.uid);
                        setAccountUrl(dashboardUrl);
                      }
                    } else {
                      setIsEmployee(false);
                      setAccountUrl("/dashboard");
                    }
                  } else {
                    setIsEmployee(false);
                    setAccountUrl("/dashboard");
                  }
                } catch (err) {
                  console.error("[Navbar] Error getting dashboard URL:", err);
                  setIsEmployee(false);
                  setAccountUrl("/dashboard");
                }
              } else {
                setIsEmployee(false);
                setAccountUrl("/dashboard");
              }
              
              setLoading(false);
              console.log("[Navbar] Auth state changed:", user ? user.email : "logged out");
            }
          });
        } else {
          // Auth not available yet - retry if we haven't exceeded max retries
          if (retryCount < maxRetries && mounted) {
            retryCount++;
            console.log(`[Navbar] Auth not ready, retrying (${retryCount}/${maxRetries})...`);
            setTimeout(checkAuthState, retryDelay);
        } else {
          // Firebase not available or not configured - just show logged out state
          if (mounted) {
            setIsLoggedIn(false);
            setLoading(false);
              console.log("[Navbar] Auth check failed after retries");
            }
          }
        }
      } catch (err: any) {
        // Retry on error if we haven't exceeded max retries
        if (retryCount < maxRetries && mounted) {
          retryCount++;
          console.log(`[Navbar] Auth check error, retrying (${retryCount}/${maxRetries}):`, err?.message || err);
          setTimeout(checkAuthState, retryDelay);
        } else {
        // Silently handle errors - don't crash the page
          console.warn("[Navbar] Firebase auth check failed after retries:", err?.message || err);
        if (mounted) {
          setIsLoggedIn(false);
          setLoading(false);
          }
        }
      }
    }

    // Start checking auth state (don't wait for firebaseReady since Firebase is clearly initializing)
    checkAuthState();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Remove firebaseReady dependency - check auth state regardless

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
              <Link href={accountUrl}>{isEmployee ? "Dashboard" : "Account"}</Link>
            ) : (
              <Link href="#account">Account</Link>
            )}
          </li>
          {!isEmployee && (
            <li>
              <Link href="/partners">Partners</Link>
            </li>
          )}
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

