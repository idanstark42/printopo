import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase'
import mapboxgl from 'mapbox-gl'

const BACKEND = 'http://127.0.0.1:8000'

// 1. Create the Context
const StoreContext = createContext()

const emptyDraftDesign = {
  title: 'my item',
  product: null,
  lng: -121.7600, 
  lat: 46.8500, 
  zoom: 11.00,
  pitch: 0,
  bearing: 0,
  style: 'idanstark42/cmsf3qksa005u01sa2fk83j4u',
}

// 2. Create the Provider Component
export function StoreProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('supabase_user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [catalog, setCatalog] = useState([])
  const [cart, setCart] = useState([])
  const [draftDesign, setDraftDesign] = useState(emptyDraftDesign)

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('supabase_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('supabase_user')
    }
  }, [user])

  // CRITICAL: Check Supabase session on startup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchCatalog() {
    const res = await fetch(`${BACKEND}/printify/catalog`)
    setCatalog(await res.json())
  }

  async function createDesign() {

  }

  async function uploadImage() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    // Alert the user since this takes 2-3 seconds
    console.log("Generating high-res 3D render...") 
    const base64Image = await generateHighResMap(draftDesign)

    // Add the image directly to your payload
    const payload = {
      title: `printopo-image-${Date.now()}`,
      image_data: base64Image
    }

    const response = await fetch(`${BACKEND}/printify/upload-artwork`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    draftDesign.fileId = result.file_id
  }

  async function generateHighResMap(draftDesign) {
    return new Promise((resolve) => {
      // 1. Create a massive hidden container
      const hiddenDiv = document.createElement('div')
      hiddenDiv.style.width = '2000px'
      hiddenDiv.style.height = '2000px'
      hiddenDiv.style.position = 'absolute'
      hiddenDiv.style.left = '-9999px' // Hide it far off-screen
      document.body.appendChild(hiddenDiv)

      // 2. Boot up a temporary map with preserveDrawingBuffer enabled
      const exportMap = new mapboxgl.Map({
        container: hiddenDiv,
        style: `mapbox://styles/${draftDesign.style}`,
        center: [draftDesign.lng, draftDesign.lat],
        zoom: draftDesign.zoom,
        pitch: draftDesign.pitch,
        bearing: draftDesign.bearing,
        preserveDrawingBuffer: true, // CRITICAL: Allows us to extract the image
        interactive: false
      })

      // 3. Wait for the 3D terrain and tiles to finish rendering completely
      exportMap.on('idle', () => {
        // Extract the raw image data
        const base64 = exportMap.getCanvas().toDataURL('image/png')
        
        // Clean up the DOM to save memory
        exportMap.remove()
        hiddenDiv.remove()
        
        // Strip the data prefix so Printify can read the raw base64 string
        const cleanBase64 = base64.replace(/^data:image\/png;base64,/, "")
        resolve(cleanBase64)
      })
    })
  }

  // Everything in this value object is globally accessible
  const value = {
    user, setUser,
    cart, setCart,
    catalog, fetchCatalog,
    draftDesign, setDraftDesign, emptyDraftDesign,
    createDesign
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

// 3. Create a custom hook for easy consumption
export const useStore = () => {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}