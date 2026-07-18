import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../context/StoreContext'

export default function Login() {
  // 'sign-in', 'sign-up', or 'reset'
  const [view, setView] = useState('sign-in') 
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null) 
  
  const navigate = useNavigate()
  const { setUser } = useStore()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (view === 'reset') {
      // --- PASSWORD RESET LOGIC ---
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Password reset link sent! Please check your email.')
        setEmail('') // Clear the input after success
      }
    } else if (view === 'sign-up') {
      // --- SIGN UP LOGIC ---
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        setError(error.message)
      } else {
        if (data.session) {
          setUser(data.user)
          navigate('/editor')
        } else {
          setMessage('Account created! Please check your email to verify.')
        }
      }
    } else {
      // --- LOGIN LOGIC ---
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
      } else {
        setUser(data.user)
        navigate('/editor')
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-50 p-4">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-forest-500">
        
        <h2 className="text-3xl font-black text-forest-900 mb-2">
          {view === 'reset' ? 'Reset Password' : view === 'sign-up' ? 'Create an account' : 'Welcome back'}
        </h2>
        <p className="text-forest-700 mb-8">
          {view === 'reset' 
            ? 'Enter your email and we will send you a reset link.' 
            : view === 'sign-up' 
              ? 'Start designing your custom maps.' 
              : 'Sign in to access your saved maps.'}
        </p>
        
        {/* Status Messages */}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{message}</div>}

        <form onSubmit={handleAuth}>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full p-3 border border-gray-300 rounded outline-none focus:border-forest-500 ${view === 'reset' ? 'mb-6' : 'mb-4'}`} 
            placeholder="Email address" 
          />

          {view !== 'reset' && (
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded outline-none focus:border-forest-500 mb-6" 
              placeholder="Password (min 6 characters)" 
            />
          )}
          
          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-forest-500 hover:bg-forest-900 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : view === 'reset' ? 'Send Reset Link' : view === 'sign-up' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {/* View Toggles */}
        <div className="mt-6 flex flex-col items-center gap-2">
          {view === 'sign-in' && (
            <button 
              onClick={() => { setView('reset'); setError(null); setMessage(null); }} 
              className="text-forest-700 hover:text-forest-900 text-sm font-semibold hover:underline"
            >
              Forgot your password?
            </button>
          )}

          <button 
            onClick={() => {
              setView(view === 'sign-in' ? 'sign-up' : 'sign-in')
              setError(null)
              setMessage(null)
            }} 
            className="text-forest-700 hover:text-forest-900 text-sm font-semibold hover:underline"
          >
            {view === 'sign-in' 
              ? "Don't have an account? Sign up." 
              : "Back to sign in."}
          </button>
        </div>
        
      </div>
    </div>
  )
}