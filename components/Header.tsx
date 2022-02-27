import React from 'react'
import s from 'classnames'
import { useRouter } from 'next/router'
import { NavLink } from './NavLink'
import styles from 'components/Header.module.scss'
import { ROUTE_LIST, ROUTES } from 'constant'

export function Header () {

  const { pathname } = useRouter()

  return (
    <header className={styles.header}>
      <h1>
        {Object.entries(ROUTES).find(([_, v]) => pathname.startsWith(v.pathname))?.[1].pageName || '404'}
      </h1>
      <nav className={styles.navLinks}>
        {ROUTE_LIST.map(i => {
          return (
            <NavLink
              key={i.pathname}
              href={i.pathname}
              className={({ isActive }) =>
                s([styles.navLink, {
                  [styles.navLinkActive]: isActive
                }])}>
              {i.linkName}
            </NavLink>
          )
        })}
      </nav>
    </header>
  )
}

