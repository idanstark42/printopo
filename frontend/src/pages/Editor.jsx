import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useDraftDesign } from '../context/DraftDesignContext'
import mapboxgl from 'mapbox-gl'

import { Map } from '../lib/map'
import Accordion from '../components/Accordion'
import NumberControl from '../components/NumberControl'
import Search from '../components/Search'
import { colorToHex } from '../lib/utils'

const LAYER_NAMES = {
  'contour': 'Topography',
  'water': 'Water',
  'background': 'Background',
  'road': 'Roads',
  'country-boundary': 'Borders',
}

const BACKEND = 'http://127.0.0.1:8000'

export default function Editor() {
  const navigate = useNavigate()
  const { cart, setUser, catalog, fetchCatalog } = useStore()
  
  const { draftDesign, setDraftDesign } = useDraftDesign()
  const layers = draftDesign.layers || {}

  const [loadingPreview, setLoadingPreview] = useState(false)
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (catalog && catalog.length === 0) fetchCatalog()
  }, [catalog])

  useEffect(() => {
    if (map.current) return

    map.current = new Map(mapContainer.current, draftDesign, setDraftDesign)
    const mapbox = map.current.map

    const resizeObserver = new ResizeObserver(() => {
      if (mapbox) mapbox.resize()
    })
    resizeObserver.observe(mapContainer.current)

    mapbox.on('move', () => {
      setDraftDesign(prev => {
        const actualZoom = mapbox.getZoom()
        const expectedTotalZoom = Map.calculateTotalZoom(prev.zoom, prev.details ?? 50)
        
        // If the map's current zoom differs from what React thinks it should be, 
        // the user is zooming using the scroll wheel / pinch gestures.
        const userZoomedMap = Math.abs(actualZoom - expectedTotalZoom) > 0.001
        
        const nextDetails = userZoomedMap ? 50 : (prev.details ?? 50)
        const currentOffset = Map.getDetailOffset(nextDetails)

        return {
          ...prev,
          lng: mapbox.getCenter().lng.toFixed(4),
          lat: mapbox.getCenter().lat.toFixed(4),
          zoom: (actualZoom - currentOffset).toFixed(2),
          details: nextDetails,
          pitch: mapbox.getPitch().toFixed(0),
          bearing: mapbox.getBearing().toFixed(0)
        }
      })
    })

    mapbox.on('styledata', () => {
      const extractedLayers = Map.extractLayers(mapbox)
      setDraftDesign(prev => ({ ...prev, layers: { ...extractedLayers, ...prev.layers } }))
    })

    return () => {
      resizeObserver.disconnect()
      if (map.current) {
        map.current.destroy()
        map.current = null
      }
    }
  }, []) 

  async function uploadDesign() {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    const base64Image = await generateHighResMap(draftDesign)

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
    setDraftDesign(prev => ({ ...prev, fileId: result.file_id }))
  }

  async function generateHighResMap(currentDraft) {
    return new Promise((resolve) => {
      const hiddenDiv = document.createElement('div')
      hiddenDiv.style.width = '2000px'
      hiddenDiv.style.height = '2000px'
      hiddenDiv.style.position = 'absolute'
      hiddenDiv.style.left = '-9999px'
      document.body.appendChild(hiddenDiv)

      const exportMap = new mapboxgl.Map({
        container: hiddenDiv,
        style: `mapbox://styles/${currentDraft.style}`,
        center: [currentDraft.lng, currentDraft.lat],
        zoom: currentDraft.zoom,
        pitch: currentDraft.pitch || 0,
        bearing: currentDraft.bearing,
        preserveDrawingBuffer: true,
        interactive: false
      })

      exportMap.on('idle', () => {
        const base64 = exportMap.getCanvas().toDataURL('image/png')
        exportMap.remove()
        hiddenDiv.remove()
        const cleanBase64 = base64.replace(/^data:image\/png;base64,/, "")
        resolve(cleanBase64)
      })
    })
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

  const currentDetails = draftDesign.details ?? 50
  const scale = Map.getScaleFactor(currentDetails)
  const currentStyleDef = Map.STYLES.find(s => s.id === draftDesign.style)
  const isStyleEditable = currentStyleDef?.editable
  const isResettable = Object.keys(layers).length > 0

  return (
    <div className="flex h-screen bg-gray-900">
      
      {/* Sidebar Controls */}
      <div className="w-80 bg-white shadow-2xl flex flex-col z-10 shrink-0">
        <div className="p-6 flex-grow overflow-y-auto">
          <Accordion title="Search Location">
            <Search 
              lng={draftDesign.lng} 
              lat={draftDesign.lat} 
              onSelect={({ lng, lat }) => {
                map.current?.flyTo(lng, lat, 12, currentDetails)
              }} 
            />
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
                          onClick={() => setDraftDesign(prev => ({ ...prev, product: item.id }))}
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
                  {Map.STYLES.map(style => (
                    <div
                      key={style.id}
                      className={`mb-2 p-2 border rounded cursor-pointer transition-all ${draftDesign.style === style.id ? 'border-forest-500 bg-forest-50' : 'border-gray-300 hover:border-gray-500'}`}
                      onClick={() => map.current?.changeStyle(style.id)}
                      title={style.name}
                      style={{ 
                        aspectRatio: 1, 
                        backgroundImage: `url(https://api.mapbox.com/styles/v1/${style.id}/static/-73.9851,40.7589,10,0,0/300x300?access_token=${Map.ACCESS_TOKEN})`,
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

                {isStyleEditable && (
                  <>
                    <div className="pt-2">
                      {isResettable && <div className="flex justify-between items-center mb-3">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            map.current?.resetStyle(draftDesign.style)
                          }} 
                          className="text-xs text-forest-900 hover:underline font-semibold"
                          title="Reset layer properties to default"
                        >
                          Reset
                        </button>
                      </div>}
                      {Object.entries(layers).map(([layerId, paintProps]) => (
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
                                      onChange={(e) => map.current?.changePaintProperty(layerId, propName, e.target.value)}
                                      className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={propValue}
                                      onChange={(e) => map.current?.changePaintProperty(layerId, propName, e.target.value)}
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
                                onChange={(val) => map.current?.changePaintProperty(layerId, propName, val)}
                                min={0} max={maxVal} step={step}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Accordion>
            </div>

            <div>
              <Accordion title="Manual Controls">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                    <input
                      type="number" step="0.0001"
                      value={draftDesign.lng}
                      onChange={(e) => map.current?.changeCoordinates(e.target.value, draftDesign.lat)}
                      className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:border-forest-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                    <input
                      type="number" step="0.0001"
                      value={draftDesign.lat}
                      onChange={(e) => map.current?.changeCoordinates(draftDesign.lng, e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded outline-none focus:border-forest-500 font-mono"
                    />
                  </div>
                </div>

                <NumberControl
                  label="Zoom (Area Size)"
                  value={Number(draftDesign.zoom)}
                  onChange={(val) => map.current?.changeZoomAndDetails(val, 50)}
                  min={0}
                  max={20}
                />
                
                <NumberControl
                  label="Increased Detail Level"
                  value={draftDesign.details}
                  onChange={(val) => map.current?.changeZoomAndDetails(draftDesign.zoom, val)}
                  min={0} max={100} step={1}
                />

                <NumberControl
                  label="Bearing (North)"
                  value={Number(draftDesign.bearing)}
                  onChange={(val) => map.current?.changeBearing(val)}
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