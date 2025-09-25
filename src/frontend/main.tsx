import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CustomApp from './CustomApp.tsx'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <BrowserRouter>
    <CustomApp />
  </BrowserRouter>
)
