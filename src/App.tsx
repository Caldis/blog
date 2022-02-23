// Libs
import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
// Style
import styles from './App.module.scss'
// Components
import { Header } from './components/Header'
import { Footer } from './components/Footer'
// Constants
import { ROUTE_DEFAULT, ROUTE_LIST } from './constants'

export function App () {

  return (
    <div className={styles.app}>
      <Header/>
      <Routes>
        {/*Main routes*/}
        {ROUTE_LIST.map((route, index) => (
          <Route key={index} path={route.path} element={<route.element/>}/>
        ))}
        {/*404 Redirect to thoughts*/}
        <Route path="*" element={<Navigate to={ROUTE_DEFAULT.path} replace/>}/>
      </Routes>
      <Footer/>
    </div>
  )
}
