import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { CoachProvider } from './context/CoachContext'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <CoachProvider>
      <App />
    </CoachProvider>
  </BrowserRouter>,
)
