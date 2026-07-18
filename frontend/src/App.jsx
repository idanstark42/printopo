import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider, useStore } from './context/StoreContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Editor from './pages/Editor'
import Catalog from './pages/Catalog'
import Preview from './pages/Preview'
import Checkout from './pages/Checkout'

import './App.css'
import 'mapbox-gl/dist/mapbox-gl.css'

// A wrapper component to protect routes reading directly from context
const ProtectedRoute = ({ children }) => {
  const { user } = useStore()
  if (!user) return <Navigate to="/login" />
  return children
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
        <Route path="/preview" element={<ProtectedRoute><Preview /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

// Wrap the router in the Provider
export default function App() {
  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  )
}