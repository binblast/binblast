// components/Navbar.tsx
"use client";

import Link from "next/link";

export function Navbar() {
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

