// components/Navbar.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

export function Navbar() {
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
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          Bin Blast Co.
        </Link>
        <ul className="nav-links">
          <li><Link href="#home">Home</Link></li>
          <li><Link href="#services">Services</Link></li>
          <li><Link href="#account">Account</Link></li>
          <li>
            <Link href="#pricing" className="nav-login">Get Started</Link>
          </li>
        </ul>
        <div className="nav-toggle">
          <span></span><span></span><span></span>
        </div>
      </div>
    </nav>
  );
}

