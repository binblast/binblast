// components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFirebase } from "@/lib/firebase-context";
import { PORTAL_INFO } from "@/lib/user-portal";

type PortalIconType = "customer" | "partner" | "employee" | "command";

interface PortalMenuItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: PortalIconType;
  showDividerBefore?: boolean;
}

function PortalIcon({ type }: { type: PortalIconType }) {
  const iconProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (type) {
    case "customer":
      return (
        <svg {...iconProps}>
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "partner":
      return (
        <svg {...iconProps}>
          <path d="M7 11V8a5 5 0 0 1 10 0v3" />
          <path d="M5 11h14v10H5z" />
          <path d="M9 15h6" />
        </svg>
      );
    case "employee":
      return (
        <svg {...iconProps}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V6a4 4 0 0 1 8 0v1" />
          <path d="M3 12h18" />
        </svg>
      );
    case "command":
      return (
        <svg {...iconProps}>
          <path d="M12 3l7 4v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V7l7-4z" />
          <path d="M9.5 12.5l1.8 1.8 3.7-3.7" />
        </svg>
      );
  }
}

function PortalDropdownItem({
  item,
  isMobileMenu,
  onNavigate,
}: {
  item: PortalMenuItem;
  isMobileMenu: boolean;
  onNavigate: () => void;
}) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate();
    router.push(item.href);
  };

  return (
    <>
      {item.showDividerBefore && (
        <div
          role="separator"
          style={{
            height: "1px",
            background: "#e5e7eb",
            margin: isMobileMenu ? "0.25rem 1.25rem" : "0.25rem 0.75rem",
          }}
        />
      )}
      <Link
        href={item.href}
        role="menuitem"
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.875rem",
          padding: isMobileMenu ? "1rem 1.25rem 1rem 2rem" : "0.875rem 1rem",
          color: "var(--text-dark)",
          textDecoration: "none",
          transition: "background-color 0.2s",
          cursor: "pointer",
          textAlign: "left",
          borderLeft: isMobileMenu ? "3px solid transparent" : "none",
          borderRadius: isMobileMenu ? "0" : "8px",
          margin: isMobileMenu ? "0" : "0 0.375rem",
          width: isMobileMenu ? "100%" : "calc(100% - 0.75rem)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
        onFocus={(e) => {
          e.currentTarget.style.backgroundColor = "#f3f4f6";
          e.currentTarget.style.outline = "2px solid #16a34a";
          e.currentTarget.style.outlineOffset = "-2px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.outline = "none";
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.25rem",
            height: "2.25rem",
            borderRadius: "8px",
            background: "#f0fdf4",
            color: "#16a34a",
            flexShrink: 0,
          }}
        >
          <PortalIcon type={item.icon} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 0 }}>
          <span style={{ fontWeight: "600", fontSize: "0.95rem", lineHeight: 1.3, color: "var(--text-dark)" }}>
            {item.title}
          </span>
          <span style={{ fontSize: "0.8rem", lineHeight: 1.4, color: "#6b7280" }}>
            {item.subtitle}
          </span>
        </span>
      </Link>
    </>
  );
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountUrl, setAccountUrl] = useState("/dashboard");
  const [isEmployee, setIsEmployee] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [isStandardCustomer, setIsStandardCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const signInRef = useRef<HTMLLIElement>(null);
  const signInButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isDashboard = pathname === "/dashboard" || pathname === "/partners/dashboard" || pathname === "/employee/dashboard";
  const showTextLogo = isHomePage || isDashboard;
  const { isReady: firebaseReady } = useFirebase();

  const closeSignIn = useCallback(() => {
    setIsSignInOpen(false);
  }, []);

  const portalMenuItems: PortalMenuItem[] = [
    {
      id: "customer",
      title: isLoggedIn && isStandardCustomer ? "My Account" : PORTAL_INFO.customer.name,
      subtitle: isLoggedIn && isStandardCustomer ? "Your account" : PORTAL_INFO.customer.subtitle,
      href: isLoggedIn && isStandardCustomer ? accountUrl : PORTAL_INFO.customer.path,
      icon: "customer",
    },
    {
      id: "partner",
      title: isLoggedIn && !isStandardCustomer && !isEmployee && !isOperator && accountUrl !== "/dashboard"
        ? "Partner Dashboard"
        : PORTAL_INFO.partner.name,
      subtitle: PORTAL_INFO.partner.subtitle,
      href: isLoggedIn && !isStandardCustomer && !isEmployee && !isOperator && accountUrl !== "/dashboard"
        ? accountUrl
        : PORTAL_INFO.partner.path,
      icon: "partner",
    },
    {
      id: "employee",
      title: isLoggedIn && isEmployee ? "Employee Dashboard" : PORTAL_INFO.employee.name,
      subtitle: PORTAL_INFO.employee.subtitle,
      href: isLoggedIn && isEmployee ? "/employee/dashboard" : PORTAL_INFO.employee.path,
      icon: "employee",
    },
    {
      id: "command",
      title: isLoggedIn && isOperator ? "Operator Dashboard" : PORTAL_INFO.operator.name,
      subtitle: PORTAL_INFO.operator.subtitle,
      href: isLoggedIn && isOperator ? "/dashboard" : PORTAL_INFO.operator.path,
      icon: "command",
      showDividerBefore: true,
    },
  ];

  const dashboardNavLabel = isOperator
    ? "Blast Command"
    : isEmployee
    ? "My Dashboard"
    : isLoggedIn && accountUrl !== "/dashboard"
    ? "Partner Dashboard"
    : isStandardCustomer
    ? "My Account"
    : null;

  const handlePortalNavigate = () => {
    closeSignIn();
    setIsMenuOpen(false);
  };

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
    const retryDelay = 500;

    async function updateUserNavigation(user: { uid: string; email: string | null }) {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const db = await getDbInstance();

        if (!db) {
          setIsEmployee(false);
          setIsOperator(false);
          setIsStandardCustomer(false);
          setAccountUrl("/dashboard");
          return;
        }

        const firestore = await safeImportFirestore();
        const { doc, getDoc } = firestore;
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;
          const userEmail = user.email || "";
          const ADMIN_EMAIL = "binblastcompany@gmail.com";
          const isOperatorRole = role === "operator" || role === "admin" || userEmail === ADMIN_EMAIL;
          const isEmployeeRole = role === "employee";

          setIsEmployee(isEmployeeRole);
          setIsOperator(isOperatorRole);

          const { getDashboardUrl } = await import("@/lib/partner-auth");
          const dashboardUrl = await getDashboardUrl(user.uid);
          setAccountUrl(isEmployeeRole ? "/employee/dashboard" : dashboardUrl);

          const isPartner = dashboardUrl !== "/dashboard" && !isEmployeeRole;
          setIsStandardCustomer(!isEmployeeRole && !isPartner && !isOperatorRole);
        } else {
          setIsEmployee(false);
          setIsOperator(false);
          setIsStandardCustomer(true);
          setAccountUrl("/dashboard");
        }
      } catch (err) {
        console.error("[Navbar] Error getting dashboard URL:", err);
        setIsEmployee(false);
        setIsOperator(false);
        setIsStandardCustomer(false);
        setAccountUrl("/dashboard");
      }
    }

    async function checkAuthState() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();

        if (!mounted) return;

        if (auth && typeof auth === "object" && "currentUser" in auth) {
          if (auth.currentUser && mounted) {
            setIsLoggedIn(true);
            await updateUserNavigation(auth.currentUser);
            setLoading(false);
            console.log("[Navbar] User is logged in:", auth.currentUser.email);
          } else if (mounted) {
            setIsLoggedIn(false);
            setIsEmployee(false);
            setIsOperator(false);
            setIsStandardCustomer(false);
            setAccountUrl("/dashboard");
            setLoading(false);
            console.log("[Navbar] No user logged in");
          }

          unsubscribe = await onAuthStateChanged(async (user) => {
            if (mounted) {
              setIsLoggedIn(!!user);

              if (user) {
                await updateUserNavigation(user);
              } else {
                setIsEmployee(false);
                setIsOperator(false);
                setIsStandardCustomer(false);
                setAccountUrl("/dashboard");
              }

              setLoading(false);
              console.log("[Navbar] Auth state changed:", user ? user.email : "logged out");
            }
          });
        } else {
          if (retryCount < maxRetries && mounted) {
            retryCount++;
            console.log(`[Navbar] Auth not ready, retrying (${retryCount}/${maxRetries})...`);
            setTimeout(checkAuthState, retryDelay);
          } else {
            if (mounted) {
              setIsLoggedIn(false);
              setLoading(false);
              console.log("[Navbar] Auth check failed after retries");
            }
          }
        }
      } catch (err: any) {
        if (retryCount < maxRetries && mounted) {
          retryCount++;
          console.log(`[Navbar] Auth check error, retrying (${retryCount}/${maxRetries}):`, err?.message || err);
          setTimeout(checkAuthState, retryDelay);
        } else {
          console.warn("[Navbar] Firebase auth check failed after retries:", err?.message || err);
          if (mounted) {
            setIsLoggedIn(false);
            setLoading(false);
          }
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
  }, []);

  const getHomeSectionHref = (sectionId: string) => {
    return isHomePage ? `#${sectionId}` : `/#${sectionId}`;
  };

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement;
      if (anchor && anchor.getAttribute("href")?.startsWith("#")) {
        const href = anchor.getAttribute("href") || "";
        if (isHomePage && href.startsWith("#") && !href.startsWith("/#")) {
          e.preventDefault();
          const targetId = href.slice(1);
          const targetElement = document.getElementById(targetId || "");
          if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80;
            window.scrollTo({
              top: offsetTop,
              behavior: "smooth",
            });
            setIsMenuOpen(false);
            closeSignIn();
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [isHomePage, closeSignIn]);

  useEffect(() => {
    if (isHomePage && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash) {
        const scrollToSection = () => {
          const targetId = hash.slice(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80;
            window.scrollTo({
              top: offsetTop,
              behavior: "smooth",
            });
          }
        };

        scrollToSection();
        setTimeout(scrollToSection, 100);
        setTimeout(scrollToSection, 500);
      }
    }
  }, [isHomePage, pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (signInRef.current && !signInRef.current.contains(event.target as Node)) {
        closeSignIn();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSignIn();
        signInButtonRef.current?.focus();
      }
    };

    if (isSignInOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isSignInOpen, closeSignIn]);

  useEffect(() => {
    closeSignIn();
    setIsMenuOpen(false);
  }, [pathname, closeSignIn]);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    closeSignIn();
  };

  const toggleSignIn = () => {
    setIsSignInOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      const { signOut } = await import("@/lib/firebase");
      await signOut();
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.warn("[Navbar] Logout failed:", err?.message || err);
      router.push("/");
      router.refresh();
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo" style={{ display: "flex", alignItems: "center", textDecoration: "none", height: "40px" }}>
          {showTextLogo ? (
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "var(--text-dark)",
                letterSpacing: "0.02em",
              }}
            >
              Bin Blast Co.
            </span>
          ) : (
            <div
              style={{
                width: "100px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                overflow: "hidden",
                position: "relative",
                padding: "2px 0",
              }}
            >
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
                  maxWidth: "100%",
                }}
                priority
              />
            </div>
          )}
        </Link>
        <ul className={`nav-links ${isMenuOpen ? "active" : ""}`}>
          <li>
            {isLoggedIn ? (
              <Link href="/">Home</Link>
            ) : (
              <Link href={getHomeSectionHref("home")}>Home</Link>
            )}
          </li>
          <li>
            {isLoggedIn ? (
              <Link href="/#pricing">Services</Link>
            ) : (
              <Link href={getHomeSectionHref("pricing")}>Services</Link>
            )}
          </li>
          <li
            ref={signInRef}
            style={{ position: "relative", width: "100%" }}
            onMouseEnter={() => {
              if (!isMenuOpen) {
                setIsSignInOpen(true);
              }
            }}
            onMouseLeave={() => {
              if (!isMenuOpen) {
                closeSignIn();
              }
            }}
          >
            <button
              ref={signInButtonRef}
              type="button"
              onClick={toggleSignIn}
              aria-haspopup="menu"
              aria-expanded={isSignInOpen}
              aria-controls="sign-in-menu"
              id="sign-in-button"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dark)",
                fontWeight: "500",
                padding: isMenuOpen ? "1.25rem" : "0.5rem 1rem",
                cursor: "pointer",
                fontSize: "inherit",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                width: "100%",
                textAlign: "left",
                borderRadius: "6px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = "2px solid #16a34a";
                e.currentTarget.style.outlineOffset = "2px";
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = "none";
              }}
            >
              <span>Sign In</span>
              <span style={{ fontSize: "0.75rem", flexShrink: 0 }} aria-hidden="true">
                {isSignInOpen ? "▲" : "▼"}
              </span>
            </button>
            {isSignInOpen && (
              <div
                style={{
                  position: isMenuOpen ? "static" : "absolute",
                  top: isMenuOpen ? "auto" : "100%",
                  left: isMenuOpen ? "auto" : "50%",
                  transform: isMenuOpen ? "none" : "translateX(-50%)",
                  paddingTop: isMenuOpen ? "0" : "8px",
                  zIndex: 1000,
                  width: isMenuOpen ? "100%" : "auto",
                }}
              >
                <div
                  id="sign-in-menu"
                  role="menu"
                  aria-labelledby="sign-in-button"
                  className="sign-in-dropdown"
                  style={{
                    background: isMenuOpen ? "#f9fafb" : "#ffffff",
                    borderRadius: isMenuOpen ? "0" : "12px",
                    boxShadow: isMenuOpen ? "none" : "0 10px 30px rgba(15, 23, 42, 0.12)",
                    border: isMenuOpen ? "none" : "1px solid #e5e7eb",
                    minWidth: isMenuOpen ? "100%" : "360px",
                    maxWidth: isMenuOpen ? "100%" : "400px",
                    padding: "0.5rem 0",
                  }}
                >
                  {portalMenuItems.map((item) => (
                    <PortalDropdownItem
                      key={item.id}
                      item={item}
                      isMobileMenu={isMenuOpen}
                      onNavigate={handlePortalNavigate}
                    />
                  ))}
                </div>
              </div>
            )}
          </li>
          {!loading && isLoggedIn && dashboardNavLabel && (
            <li>
              <Link href={accountUrl}>{dashboardNavLabel}</Link>
            </li>
          )}
          {!loading && isLoggedIn && (
            <li>
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
                  transition: "color 0.3s",
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
            </li>
          )}
          <li>
            <Link href={getHomeSectionHref("pricing")} className="nav-login">
              Get Started
            </Link>
          </li>
        </ul>
        <button className="nav-toggle" onClick={toggleMenu} aria-label="Toggle menu" aria-expanded={isMenuOpen}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
}
