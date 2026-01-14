"use client"

import Link from "next/link"
import { ReactNode } from "react"

type NavLinkProps = {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick()
    }
    // Let the browser handle the navigation naturally
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  )
}