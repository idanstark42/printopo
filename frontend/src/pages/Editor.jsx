import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import mapboxgl from 'mapbox-gl'

import Accordion from '../components/Accordion'
import NumberControl from '../components/NumberControl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const STYLES = [
  { id: 'idanstark42/cmsf3qksa005u01sa2fk83j4u', name: 'Topography Light', editable: true },
  { id: 'idanstark42/cmsfwsqj700iy01s91xseeo19', name: 'Topography Dark', editable: true },
  { id: 'mapbox/satellite-v9', name: 'Satellite View', editable: false }
]

const LAYER_NAMES = {
  'contour': 'Topography',
  'water': 'Water',
  'background': 'Background',
  'road': 'Roads',
  'country-boundary': 'Borders',
}

const colorToHex = (colorStr) => {
  if (!colorStr) return '#000000'
  if (colorStr.startsWith('#')) {
    if (colorStr.length === 4) return '#' + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2] + colorStr[3] + colorStr[3]
    return colorStr.substring(0, 7)
  }
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = colorStr
  const computed = ctx.fillStyle
  return computed.startsWith('#') ? computed.substring(0, 7) : '#000000'
}

export default function Editor() {
  const navigate = useNavigate()
  const { draftDesign, setDraftDesign, cart, setUser, uploadDesign, catalog, fetchCatalog } = useStore()

  const [loadingPreview, setLoadingPreview] = useState(false)

  // Accordion State Manager
  const [expanded, setExpanded] = useState({
    search: true,
    product: true,
    style: true,
    styling: true,
    manual: false
  })
  const toggleSection = (sec) => setExpanded(prev => ({ ...prev, [sec]: !prev[sec] }))

  const mapContainer = useRef(null)
  const map = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [layerProps, setLayerProps] = useState({})

  const BASE_OFFSET = 3;
  const currentDetails = draftDesign.details ?? 50; 
  
  const getDetailZoomOffset = (detailsVal) => ((detailsVal - 50) / 50) * BASE_OFFSET;

  const detailZoomRef = useRef(getDetailZoomOffset(currentDetails));
  const scale = Math.pow(2, detailZoomRef.current);

  useEffect(() => {
    if (catalog && catalog.length === 0) {
      fetchCatalog()
    }
  }, [catalog])

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/${draftDesign.style}`,
      center: [Number(draftDesign.lng), Number(draftDesign.lat)],
      zoom: Number(draftDesign.zoom) + detailZoomRef.current,
      dragPitch: false, 
      touchPitch: false, 
      pitchWithRotate: false, 
      preserveDrawingBuffer: true 
    })

    const resizeObserver = new ResizeObserver(() => {
      if (map.current) map.current.resize()
    })

    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current)
    }

    map.current.on('move', () => {
      if (!map.current) return;
      
      // When dragging/zooming the map directly, update base zoom and reset details to default (50) matching that new zoom
      const actualMapZoom = map.current.getZoom();
      const newBaseZoom = actualMapZoom - detailZoomRef.current;

      setDraftDesign(current => ({
        ...current,
        lng: map.current.getCenter().lng.toFixed(4),
        lat: map.current.getCenter().lat.toFixed(4),
        zoom: newBaseZoom.toFixed(2),
        details: 50, // Reset/override details to default matching zoom on free move
        pitch: map.current.getPitch().toFixed(0),
        bearing: map.current.getBearing().toFixed(0)
      }))
    })

    map.current.on('styledata', () => {
      extractMapLayers()
    })

    return () => {
      resizeObserver.disconnect()
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  const extractMapLayers = () => {
    if (!map.current || !map.current.style || !map.current.style._layers) return
    const newLayerProps = {}

    Object.keys(map.current.style._layers).forEach(layerId => {
      const layerObj = map.current.getLayer(layerId)
      if (layerObj && layerObj.paint) {
        const cleanPaint = {}
        Object.entries(layerObj.paint).forEach(([k, v]) => {
          if (typeof v === 'string' || typeof v === 'number') {
            cleanPaint[k] = v
          }
        })
        if (Object.keys(cleanPaint).length > 0) {
          newLayerProps[layerId] = cleanPaint
        }
      }
    })
    setLayerProps(newLayerProps)
  }

  const handleManualCoordinateChange = (field, value) => {
    const numValue = parseFloat(value)

    if (field === 'zoom' && !isNaN(numValue)) {
      // When typing or sliding zoom manually, update zoom and override details back to default (50)
      const newOffset = getDetailZoomOffset(50);
      detailZoomRef.current = newOffset;

      const newState = { ...draftDesign, zoom: value, details: 50 }
      setDraftDesign(newState)

      if (map.current) {
        map.current.setZoom(numValue + newOffset);
        setTimeout(() => {
          if (map.current) map.current.resize();
        }, 0);
      }
      return;
    }

    const newState = { ...draftDesign, [field]: value }
    setDraftDesign(newState)

    if (!isNaN(numValue) && map.current && field !== 'zoom') {
      map.current.setCenter([Number(newState.lng), Number(newState.lat)])
    }
  }

  const handleDetailsChange = (val) => {
    const newOffset = getDetailZoomOffset(val);
    const deltaZoom = newOffset - detailZoomRef.current;
    
    detailZoomRef.current = newOffset;
    setDraftDesign(prev => ({ ...prev, details: val }));
    
    if (map.current) {
      map.current.setZoom(map.current.getZoom() + deltaZoom);
      setTimeout(() => {
        if (map.current) map.current.resize();
      }, 0);
    }
  }

  const handleStyleChange = (e) => {
    const style = e.target.value
    setDraftDesign({ ...draftDesign, style })
    if (map.current) {
      map.current.setStyle(`mapbox://styles/${style}`)
    }
  }

  const handlePaintPropertyChange = (layerId, propName, value) => {
    if (map.current) {
      map.current.setPaintProperty(layerId, propName, value)
    }
    setLayerProps(prev => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        [propName]: value
      }
    }))
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery) return
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxgl.accessToken}`)
    const data = await res.json()
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      map.current.flyTo({ center: [lng, lat], zoom: 12 + detailZoomRef.current })
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
  const categories = catalog.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const currentStyleDef = STYLES.find(s => s.id === draftDesign.style)
  const isStyleEditable = currentStyleDef?.editable

  return (
    <div className="flex h-screen bg-gray-900">

      {/* Sidebar Controls */}
      <div className="w-80 bg-white shadow-2xl flex flex-col z-10 shrink-0">
        <div className="p-6 flex-grow overflow-y-auto">
          <Accordion title="Search Location">
            <form onSubmit={handleSearch} className="mb-4">
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
          </Accordion>

          <div className="space-y-2">
            <div>
              <Accordion title="Product">
                {Object.entries(categories).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 mb-1">{category}</h3>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`mb-2 border rounded cursor-pointer transition-all ${draftDesign.product === item.id ? 'border-forest-500 bg-forest-50' : 'border-gray-300 hover:border-gray-500'}`}
                          onClick={() => setDraftDesign({ ...draftDesign, product: item.id })}
                          style={{ backgroundImage: `url(${item.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', aspectRatio: 1 }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </Accordion>
            </div>

            <div>
              <Accordion title="Map Style">
                <div className="grid grid-cols-3 gap-2">
                  {STYLES.map(style => (
                    <div
                      key={style.id}
                      className={`mb-2 p-2 border rounded cursor-pointer transition-all ${draftDesign.style === style.id ? 'border-forest-500 bg-forest-50' : 'border-gray-300 hover:border-gray-500'}`}
                      onClick={() => handleStyleChange({ target: { value: style.id } })}
                      title={style.name}
                      style={{ 
                        aspectRatio: 1, 
                        backgroundImage: `url(https://api.mapbox.com/styles/v1/${style.id}/static/-73.9851,40.7589,10,0,0/300x300?access_token=${mapboxgl.accessToken})`,
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}
                    >
                      <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[10px] font-bold text-center backdrop-blur-sm truncate">
                        {style.name}
                      </div>
                    </div>
                  ))}
                </div>
              </Accordion>
            </div>

            {isStyleEditable && (
              <div>
                <Accordion title="Map Styling">
                  {Object.entries(layerProps).map(([layerId, paintProps]) => (
                    <div key={layerId} className="mb-5 p-3 bg-gray-50 rounded border border-gray-100">
                      <h4 className="text-xs font-bold text-forest-900 mb-3 uppercase tracking-wider">{LAYER_NAMES[layerId] || layerId}</h4>
                      {Object.entries(paintProps).map(([propName, propValue]) => {
                        const isColor = propName.includes('color')

                        if (isColor) {
                          return (
                            <div key={propName} className="mb-3 flex justify-between items-center">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">{propName}</label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="color"
                                  value={colorToHex(propValue)}
                                  onChange={(e) => handlePaintPropertyChange(layerId, propName, e.target.value)}
                                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={propValue}
                                  onChange={(e) => handlePaintPropertyChange(layerId, propName, e.target.value)}
                                  className="w-20 p-1 text-[10px] border border-gray-300 rounded font-mono"
                                />
                              </div>
                            </div>
                          )
                        }

                        const maxVal = propName.includes('opacity') ? 1 : 20
                        const step = propName.includes('opacity') ? 0.05 : 0.5

                        return (
                          <NumberControl
                            key={propName}
                            label={propName}
                            value={Number(propValue)}
                            onChange={(val) => handlePaintPropertyChange(layerId, propName, val)}
                            min={0} max={maxVal} step={step}
                          />
                        )
                      })}
                    </div>
                  ))}
                </Accordion>
              </div>
            )}

            <div>
              <Accordion title="Manual Controls">
                <div className="grid grid-cols-2 gap-3 mb-4">
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

                <NumberControl
                  label="Zoom (Area Size)"
                  value={Number(draftDesign.zoom)}
                  onChange={(val) => handleManualCoordinateChange('zoom', val)}
                  max={20}
                />
                
                <NumberControl
                  label="Details (Resolution)"
                  value={currentDetails}
                  onChange={handleDetailsChange}
                  min={0} max={100} step={1}
                />

                <NumberControl
                  label="Bearing (North)"
                  value={Number(draftDesign.bearing)}
                  onChange={(val) => {
                    setDraftDesign(prev => ({ ...prev, bearing: val }))
                    map.current?.setBearing(val)
                  }}
                  min={-180} max={180} step={1}
                />
              </Accordion>
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

      {/* Map Area */}
      <div className="flex-grow relative w-full h-full flex justify-center items-center overflow-hidden bg-gray-100">
        
        {/* Scaled mapbox container */}
        <div 
          ref={mapContainer} 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            transform: `scale(${1 / scale})`,
            transformOrigin: 'top left'
          }}
        />

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