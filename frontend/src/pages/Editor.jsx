import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const PRODUCTS = [
  { sku: 'pillow-18x18', name: 'Throw Pillow', width: 18, height: 18, price: 40.00 },
  { sku: 'canvas-24x36', name: 'Canvas Print', width: 24, height: 36, price: 85.00 },
]

// Define the available Mapbox base styles
const STYLES = [
  { id: 'idanstark42/cmrn6eyww002101qxe4no5yko', name: 'Topography Day' },
  { id: 'idanstark42/cmrn6kywp001z01qt9on6dwk4', name: 'Topography Night' },
  { id: 'mapbox/outdoors-v12', name: 'Topographic (Outdoors)' },
  { id: 'mapbox/light-v11', name: 'Minimal Light' },
  { id: 'dark-mapbox/v11', name: 'Minimal Dark' },
  { id: 'mapbox/satellite-v9', name: 'Satellite View' }
]

export default function Editor() {
  const navigate = useNavigate()
  const { draftDesign, setDraftDesign, cart, setUser, uploadDesign, catalog, fetchCatalog, } = useStore()
  const [loadingPreview, setLoadingPreview] = useState(false)
  
  const mapContainer = useRef(null)
  const map = useRef(null)
  
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if(catalog && catalog.length === 0) {
      fetchCatalog()
    } else {
      console.log(catalog)
    }

  }, [catalog])

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/${draftDesign.style}`, 
      center: [Number(draftDesign.lng), Number(draftDesign.lat)],
      zoom: Number(draftDesign.zoom)
    })

    const resizeObserver = new ResizeObserver(() => {
      if (map.current) map.current.resize()
    })
    
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current)
    }

    // When the map is dragged/zoomed with the mouse, update the input fields
    map.current.on('move', () => {
      setDraftDesign(current => ({
        ...current,
        lng: map.current.getCenter().lng.toFixed(4),
        lat: map.current.getCenter().lat.toFixed(4),
        zoom: map.current.getZoom().toFixed(2),
        pitch: map.current.getPitch().toFixed(0),
        bearing: map.current.getBearing().toFixed(0)
      }))
    })

    return () => {
      resizeObserver.disconnect()
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, []) 

  const handleManualCoordinateChange = (field, value) => {
    const newState = { ...draftDesign, [field]: value }
    setDraftDesign(newState)

    // Only move the map if the user has typed a valid number
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && map.current) {
      if (field === 'zoom') {
        map.current.setZoom(numValue)
      } else {
        map.current.setCenter([Number(newState.lng), Number(newState.lat)])
      }
    }
  }

  const handleProductChange = e => {
    setDraftDesign({ ...draftDesign, product: e.target.value })
  }

  const handleStyleChange = (e) => {
    const style = e.target.value
    setDraftDesign({ ...draftDesign, style })
    if (map.current) {
      map.current.setStyle(`mapbox://styles/mapbox/${style}`)
    }
  }

  // ----------------------------

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery) return
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxgl.accessToken}`)
    const data = await res.json()
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      map.current.flyTo({ center: [lng, lat], zoom: 12 })
    }
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    await uploadDesign()
    navigate('/preview')
  }

  const handleLogout = () => {
    setUser(null)
    navigate('/')
  }

  const product = catalog.find(p => p.id === draftDesign.product)

  return (
    <div className="flex h-screen bg-gray-900">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-white shadow-2xl flex flex-col z-10 shrink-0">
        <div className="p-6 flex-grow overflow-y-auto">
          
          <form onSubmit={handleSearch} className="mb-6 pb-6 border-b border-gray-100">
            <label className="block text-sm font-bold text-gray-700 mb-1">Search Location</label>
            <div className="flex gap-2">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow p-2 border border-gray-300 rounded focus:ring-1 focus:ring-forest-500 focus:border-forest-500 outline-none transition-all" 
                placeholder="e.g. Central Park, NY" 
              />
              <button type="submit" className="bg-forest-900 hover:bg-forest-700 text-white px-3 py-2 rounded font-bold transition-colors">Go</button>
            </div>
          </form>

          {/* Configuration Parameters */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Product</label>
              <select 
                value={draftDesign.product}
                onChange={handleProductChange}
                className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-500 transition-all bg-white"
              >
                {catalog.map(item => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Map Style</label>
              <select 
                value={draftDesign.style}
                onChange={handleStyleChange}
                className="w-full p-2 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-500 transition-all bg-white"
              >
                {STYLES.map(style => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
            </div>

            {/* Precision Controls */}
            <div className="pt-4 border-t border-gray-100">
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                  <input 
                    type="number" step="0.0001"
                    value={draftDesign.lng} 
                    onChange={(e) => handleManualCoordinateChange('lng', e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:border-forest-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                  <input 
                    type="number" step="0.0001"
                    value={draftDesign.lat} 
                    onChange={(e) => handleManualCoordinateChange('lat', e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:border-forest-500 font-mono" 
                  />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Zoom</label>
                <input 
                  type="number" max="20" step="0.1"
                  value={draftDesign.zoom}
                  onChange={(e) => handleManualCoordinateChange('zoom', e.target.value)}
                  className="w-16 p-1 text-xs border border-gray-300 rounded text-center font-mono"
                />
              </div>
              <input 
                type="range" max="20" step="0.1"
                value={draftDesign.zoom} 
                onChange={(e) => handleManualCoordinateChange('zoom', e.target.value)}
                className="w-full accent-forest-500" 
              />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Pitch (Tilt)</label>
                <input 
                  type="number" min="0" max="85"
                  value={draftDesign.pitch}
                  onChange={(e) => {
                    const val = Math.min(Math.max(Number(e.target.value), 0), 85);
                    setDraftDesign(prev => ({ ...prev, pitch: val }));
                    map.current?.setPitch(val);
                  }}
                  className="w-16 p-1 text-xs border border-gray-300 rounded text-center font-mono"
                />
              </div>
              <input 
                type="range" min="0" max="85"
                value={draftDesign.pitch} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDraftDesign(prev => ({ ...prev, pitch: val }));
                  map.current?.setPitch(val);
                }}
                className="w-full accent-forest-500" 
              />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Bearing (North)</label>
                <input 
                  type="number" min="-180" max="180"
                  value={draftDesign.bearing}
                  onChange={(e) => {
                    const val = Math.min(Math.max(Number(e.target.value), -180), 180);
                    setDraftDesign(prev => ({ ...prev, bearing: val }));
                    map.current?.setBearing(val);
                  }}
                  className="w-16 p-1 text-xs border border-gray-300 rounded text-center font-mono"
                />
              </div>
              <input 
                type="range" min="-180" max="180"
                value={draftDesign.bearing} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDraftDesign(prev => ({ ...prev, bearing: val }));
                  map.current?.setBearing(val);
                }}
                className="w-full accent-forest-500" 
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
          <button 
            onClick={handlePreview} 
            className="w-full bg-forest-500 hover:bg-forest-900 text-white font-black py-4 rounded shadow-lg transition-all transform hover:-translate-y-0.5 disabled:bg-forest-200 disabled:pointer-events-none flex items-center justify-center gap-2"
            disabled={loadingPreview}
          >
            {loadingPreview ? <>
              <svg xmlns="http://www.w3.org/2000/svg"
                  className="size-8 animate-[spin_0.8s_linear_infinite] dark:fill-white" viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    d="M12 22c5.421 0 10-4.579 10-10h-2c0 4.337-3.663 8-8 8s-8-3.663-8-8c0-4.336 3.663-8 8-8V2C6.579 2 2 6.58 2 12c0 5.421 4.579 10 10 10z" />
              </svg>
              <span className='text-white'>Loading...</span>
              <span className="sr-only"></span>
            </> : 'Generate 3D Preview'}
          </button>

          <div className="flex justify-between items-center text-sm font-bold">
            <Link to="/checkout" className="text-forest-900 hover:underline">
              🛒 Cart ({cart.length})
            </Link>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow relative w-full h-full flex justify-center items-center overflow-hidden bg-gray-100">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
        
        {product ? <div 
          className="absolute z-10 border-4 border-dashed border-gray-800 bg-white/10 pointer-events-none shadow-2xl flex items-center justify-center transition-all duration-300"
          style={{ 
            width: `${product.width * 15}px`, 
            height: `${product.height * 15}px`, 
            maxWidth: '90%', maxHeight: '90%' 
          }}
          >
        </div> : ''}
      </div>
    </div>
  )
}