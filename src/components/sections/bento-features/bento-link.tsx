"use client";

import Link from "next/link";
import React from "react";

interface BentoLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export function BentoLink({ href, className, children }: BentoLinkProps) {
  const handleClick = () => {
    window.history.replaceState(null, '', '/#bento-features');
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}