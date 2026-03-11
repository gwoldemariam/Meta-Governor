import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Apply saved theme before first render to prevent flash
const savedTheme = localStorage.getItem('mg-theme')
if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark')
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
)