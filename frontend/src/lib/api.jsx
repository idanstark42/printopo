import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL

export const api = {
  async fetch(endpoint, options = {}) {
    // 1. Get the current user's token
    const { data: { session } } = await supabase.auth.getSession()
    
    // 2. Setup standard headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // 3. Inject Bearer token if logged in
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    // 4. Execute request
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'API Request Failed')
    }

    return response.json()
  },

  post(endpoint, body) {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}