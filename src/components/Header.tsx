import React from 'react'
import s from 'classnames'
import { NavLink, useLocation } from 'react-router-dom'
import styles from './Header.module.scss'
import { ROUTE_LIST, ROUTES } from '../constants'

export function Header () {
  const location = useLocation()
  return (
    <header className={styles.header}>
      <h1>
        {Object.entries(ROUTES).find(([_, v]) => location.pathname.startsWith(v.path))?.[1].pageName || 404}
      </h1>
      <nav className={styles.navLinks}>
        {ROUTE_LIST.map(i => {
          return (
            <NavLink
              key={i.path}
              to={i.path}
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
