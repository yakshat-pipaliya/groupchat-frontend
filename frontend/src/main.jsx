import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SocketProvider } from './contexts/SocketContext.jsx'
import { ChatProvider } from './contexts/ChatContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SocketProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </SocketProvider>
  </StrictMode>,
)
