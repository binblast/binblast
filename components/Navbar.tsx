// components/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { useFirebase } from "@/lib/firebase-context";
import { PORTAL_INFO } from "@/lib/user-portal";
import { buildAttributedHomeHref } from "@/lib/referral-attribution";
import { BrandLogo } from "@/components/BrandLogo";

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
          className={`portal-menu-divider${isMobileMenu ? " portal-menu-divider--mobile" : ""}`}
        />
      )}
      <Link
        href={item.href}
        role="menuitem"
        onClick={handleClick}
        className={`portal-menu-item${isMobileMenu ? " portal-menu-item--mobile" : ""}`}
        onMouseEnter={(e) => {
          if (!isMobileMenu) e.currentTarget.style.backgroundColor = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          if (!isMobileMenu) e.currentTarget.style.backgroundColor = "transparent";
        }}
        onFocus={(e) => {
          e.currentTarget.style.backgroundColor = isMobileMenu ? "rgba(255, 255, 255, 0.1)" : "#f3f4f6";
          e.currentTarget.style.outline = "2px solid #16a34a";
          e.currentTarget.style.outlineOffset = "-2px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.outline = "none";
        }}
      >
        <span className="portal-menu-item__icon">
          <PortalIcon type={item.icon} />
        </span>
        <span className="portal-menu-item__text">
          <span className="portal-menu-item__title">{item.title}</span>
          <span className="portal-menu-item__subtitle">{item.subtitle}</span>
        </span>
      </Link>
    </>
  );
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountUrl, setAccountUrl] = useState("/dashboard");
  const [isEmployee, setIsEmployee] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [isStandardCustomer, setIsStandardCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const signInRef = useRef<HTMLLIElement>(null);
  const signInButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const { isReady: firebaseReady } = useFirebase();

  const closeSignIn = useCallback(() => {
    setIsSignInOpen(false);
  }, []);

  useEffect(() => {
    setPortalReady(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const syncViewport = () => {
      const mobile = mq.matches;
      setIsMobileNav(mobile);
      if (!mobile) {
        setIsMenuOpen(false);
      }
    };

    syncViewport();
    mq.addEventListener("change", syncViewport);
    return () => mq.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add("nav-menu-open");
    } else {
      document.body.classList.remove("nav-menu-open");
      setIsSignInOpen(false);
    }
    return () => {
      document.body.classList.remove("nav-menu-open");
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const menu = mobileNavRef.current;
    if (!menu) return;

    menu.setAttribute("aria-hidden", isMenuOpen ? "false" : "true");
    if ("inert" in menu) {
      (menu as HTMLElement & { inert: boolean }).inert = !isMenuOpen;
    }
  }, [isMenuOpen]);

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
          const dashboardUrl = await getDashboardUrl(user.uid, userEmail);
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
    return isHomePage ? `#${sectionId}` : buildAttributedHomeHref(sectionId);
  };

  const homeRootHref = isHomePage ? "/" : buildAttributedHomeHref();

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
          const hashValue = hash.slice(1);
          const targetId = hashValue.split("?")[0];
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

    if (isSignInOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSignInOpen, closeSignIn]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isMenuOpen) {
          setIsMenuOpen(false);
        }
        if (isSignInOpen) {
          closeSignIn();
          signInButtonRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen, isSignInOpen, closeSignIn]);

  useEffect(() => {
    closeSignIn();
    setIsMenuOpen(false);
  }, [pathname, closeSignIn]);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    closeSignIn();
  };

  const toggleSignIn = () => {
    setIsSignInOpen((prev) => !prev);
  };

  const isHomeActive = pathname === "/";
  const isResidentialActive = pathname === "/residential-trash-can-cleaning";
  const isCommercialActive = pathname === "/commercial-trash-bin-cleaning";
  const isCareersActive = pathname === "/careers";
  const isDashboardActive =
    pathname === accountUrl ||
    (pathname === "/dashboard" && isLoggedIn) ||
    (pathname === "/employee/dashboard" && isEmployee) ||
    (pathname === "/partners/dashboard" && isLoggedIn && !isStandardCustomer);

  const navPillClass = (active: boolean, extra = "") =>
    `nav-pill${active ? " nav-pill--active" : ""}${extra ? ` ${extra}` : ""}`;

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

  const guestSignInItems: PortalMenuItem[] = [
    {
      id: "customer",
      title: "Customer Sign In",
      subtitle: "Manage cleanings, billing, and account details",
      href: "/login",
      icon: "customer",
    },
    {
      id: "employee",
      title: "Employee Sign In",
      subtitle: "Access routes, jobs, and employee tools",
      href: "/employee",
      icon: "employee",
    },
    {
      id: "command",
      title: "Admin Sign In",
      subtitle: "Owner and operator portal access",
      href: "/login",
      icon: "command",
      showDividerBefore: true,
    },
  ];

  const signInMenuItems = isLoggedIn ? portalMenuItems : guestSignInItems;

  const navLinks = (
    <ul
      ref={mobileNavRef}
      id="mobile-nav-menu"
      role={isMenuOpen ? "dialog" : undefined}
      aria-modal={isMenuOpen ? true : undefined}
      aria-hidden={!isMenuOpen}
      aria-label={isMenuOpen ? "Site navigation" : undefined}
      className={`nav-links nav-links--segmented${isMobileNav ? " nav-links--mobile-portal" : ""}${isMenuOpen ? " active nav-mobile-menu" : ""}`}
    >
      <li>
        {isLoggedIn ? (
          <Link href={homeRootHref} className={navPillClass(isHomeActive)}>
            Home
          </Link>
        ) : (
          <Link href={getHomeSectionHref("home")} className={navPillClass(isHomeActive)}>
            Home
          </Link>
        )}
      </li>
      <li>
        <Link href="/residential-trash-can-cleaning" className={navPillClass(isResidentialActive)}>
          Residential
        </Link>
      </li>
      <li>
        <Link href="/commercial-trash-bin-cleaning" className={navPillClass(isCommercialActive)}>
          Commercial
        </Link>
      </li>
      <li>
        <Link href={getHomeSectionHref("service-areas")} className={navPillClass(false)}>
          Service Areas
        </Link>
      </li>
      <li>
        <Link href="/careers" className={navPillClass(isCareersActive)}>
          Careers
        </Link>
      </li>
      <li
        ref={signInRef}
        className="nav-sign-in-item"
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
          className={navPillClass(isSignInOpen && isMenuOpen, "nav-pill--ghost nav-sign-in-toggle")}
        >
          <span>{isMenuOpen ? "Portals" : "Sign In"}</span>
          <span className="nav-pill__chevron" aria-hidden="true">
            {isSignInOpen ? "▲" : "▼"}
          </span>
        </button>
        {isSignInOpen && (
          <div className="sign-in-dropdown-wrap">
            <div
              id="sign-in-menu"
              role="menu"
              aria-labelledby="sign-in-button"
              className="sign-in-dropdown"
            >
              {signInMenuItems.map((item) => (
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
          <Link href={accountUrl} className={navPillClass(isDashboardActive)}>
            {dashboardNavLabel}
          </Link>
        </li>
      )}
      {!loading && isLoggedIn && (
        <li>
          <button type="button" onClick={handleLogout} className="nav-pill nav-pill--ghost">
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
  );

  const mobileNavLayer = (
    <>
      {isMenuOpen && (
        <button
          type="button"
          className="nav-mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      {navLinks}
    </>
  );

  return (
    <>
      <nav className={`navbar${isMenuOpen ? " nav-open" : ""}${isScrolled ? " navbar--scrolled" : ""}`}>
        <div className="nav-container">
          <Link
            href={homeRootHref}
            className={`nav-logo${isHomePage ? " nav-logo--home" : ""}`}
          >
            <BrandLogo
              variant="nav"
              tone="none"
              className={isHomePage ? "brand-logo--nav-home" : ""}
              priority={isHomePage}
            />
          </Link>
          {!isMobileNav && navLinks}
          <button
            type="button"
            className="nav-toggle"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
      {portalReady && isMobileNav && createPortal(mobileNavLayer, document.body)}
    </>
  );
}
