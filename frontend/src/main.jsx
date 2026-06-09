import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      {/* NO ROUTER HERE - It is now inside App.jsx */}
      <App />
  </React.StrictMode>,
)