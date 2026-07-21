"use client";

import dynamic from "next/dynamic";
import { BinBlasterApplicationWizard } from "@/components/BinBlaster/BinBlasterApplicationWizard";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export default function EmployeeRegisterPage() {
  return (
    <>
      <Navbar />
      <BinBlasterApplicationWizard />
    </>
  );
}
