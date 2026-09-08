import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// floating damage number keyframes
const style = document.createElement('style')
style.textContent = `@keyframes fadeUp{
  0%{opacity:0;transform:translateY(6px) scale(.8)}
  18%{opacity:1;transform:translateY(0) scale(1.06)}
  100%{opacity:0;transform:translateY(-26px) scale(.95)}}`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(<App />)
