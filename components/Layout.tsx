import React from 'react'
import styles from './Layout.module.scss'
import { Header } from 'components/Header'
import { Footer } from 'components/Footer'

type Props = {
  children: React.ReactNode
}

export function Layout ({ children }: Props) {
  return (
    <div className={styles.container}>
      <Header/>
      <main className={styles.content}>
        {children}
      </main>
      <Footer/>
    </div>
  )
}
