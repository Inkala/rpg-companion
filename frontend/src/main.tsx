import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import { App } from './App'
import { prepareInitialNavigation } from './app/initialNavigation'

const initialNavigation = prepareInitialNavigation({
  location: window.location,
  history: window.history,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      initialRoute={initialNavigation.route}
      initialInviteToken={initialNavigation.inviteToken}
    />
  </StrictMode>,
)
