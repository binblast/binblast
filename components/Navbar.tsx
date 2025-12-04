// components/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check Firebase auth state
    async function checkAuth() {
      try {
        const { auth } = await import("@/lib/firebase");
        const { onAuthStateChanged } = await import("firebase/auth");
        
        if (auth) {
          onAuthStateChanged(auth, (user) => {
            setIsLoggedIn(!!user);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking auth:", err);
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

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
      const { auth } = await import("@/lib/firebase");
      const { signOut } = await import("firebase/auth");
      
      if (auth) {
        await signOut(auth);
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          Bin Blast Co.
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
              <Link href="/#services">Services</Link>
            ) : (
              <Link href="#services">Services</Link>
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

