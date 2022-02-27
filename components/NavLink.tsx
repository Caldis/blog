import React from 'react'
import Link, { LinkProps } from 'next/link'
import { useRouter } from 'next/router'

type Props = LinkProps & {
  exact?: boolean,
  className: (p: { isActive: boolean }) => string,
  children: React.ReactNode,
}

export function NavLink ({ exact, className, children, ...props }: Props) {
  const { pathname } = useRouter()
  const isActive = exact ? pathname === props.href : pathname.startsWith(props.href.toString())

  return (
    <Link {...props}>
      <a className={className({ isActive })}>
        {children}
      </a>
    </Link>
  )
}
