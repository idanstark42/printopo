import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export class Map {
  constructor(container, draftDesign, setDraftDesign) {
    this.setDraftDesign = setDraftDesign
    
    this.map = new mapboxgl.Map({
      container: container,
      style: `mapbox://styles/${draftDesign.style || Map.STYLES[0].id}`,
      center: [Number(draftDesign.lng) || 0, Number(draftDesign.lat) || 0],
      zoom: Map.calculateTotalZoom(Number(draftDesign.zoom), Number(draftDesign.details)),
      bearing: Number(draftDesign.bearing) || 0,
      dragPitch: false,
      touchPitch: false,
      pitchWithRotate: false,
      preserveDrawingBuffer: true
    })
  }

  static getDetailOffset(detailsVal = 50) {
    return ((detailsVal - 50) / 50) * 2
  }

  static calculateTotalZoom(baseZ, detailsVal) {
    return Number(baseZ) + Map.getDetailOffset(detailsVal)
  }

  static getScaleFactor(detailsVal) {
    return Math.pow(2, Map.getDetailOffset(detailsVal))
  }

  static extractLayers(mapboxMap) {
    if (!mapboxMap || !mapboxMap.style || !mapboxMap.style._layers) return {}
    const layerProps = {}

    Object.keys(mapboxMap.style._layers).forEach(layerId => {
      const layerObj = mapboxMap.getLayer(layerId)
      if (layerObj && layerObj.paint) {
        const cleanPaint = {}
        Object.entries(layerObj.paint).forEach(([k, v]) => {
          if (typeof v === 'string' || typeof v === 'number') {
            cleanPaint[k] = v
          }
        })
        if (Object.keys(cleanPaint).length > 0) {
          layerProps[layerId] = cleanPaint
        }
      }
    })
    return layerProps
  }

  changeZoomAndDetails(zoom, details) {
    this.setDraftDesign(prev => ({ ...prev, zoom, details }))
    const nZoom = Number(zoom)
    const nDetails = Number(details)
    
    if (!isNaN(nZoom) && !isNaN(nDetails)) {
      this.map.setZoom(Map.calculateTotalZoom(nZoom, nDetails))
    }
  }

  changeCoordinates(lng, lat) {
    this.setDraftDesign(prev => ({ ...prev, lng, lat }))
    const nLng = Number(lng)
    const nLat = Number(lat)
    
    if (!isNaN(nLng) && !isNaN(nLat)) {
      this.map.setCenter([nLng, nLat])
    }
  }

  changeBearing(bearing) {
    this.setDraftDesign(prev => ({ ...prev, bearing }))
    const nBearing = Number(bearing)
    
    if (!isNaN(nBearing)) {
      this.map.setBearing(nBearing)
    }
  }

  changeStyle(styleId) {
    this.setDraftDesign(prev => ({ ...prev, style: styleId }))
    this.map.setStyle(`mapbox://styles/${styleId}`)
  }

  resetStyle(styleId) {
    this.setDraftDesign(prev => ({ ...prev, layers: {} }))
    this.map.setStyle(`mapbox://styles/${styleId}`)
  }

  changePaintProperty(layerId, propName, value) {
    this.setDraftDesign(prev => ({
      ...prev,
      layers: {
        ...prev.layers,
        [layerId]: { ...prev.layers?.[layerId], [propName]: value }
      }
    }))
    this.map.setPaintProperty(layerId, propName, value)
  }

  flyTo(lng, lat, zoom = 12, details = 50) {
    this.setDraftDesign(prev => ({ ...prev, lng, lat, zoom }))
    this.map.flyTo({ 
      center: [Number(lng), Number(lat)], 
      zoom: Map.calculateTotalZoom(Number(zoom), Number(details)) 
    })
  }

  destroy() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  static STYLES = [
    { id: 'idanstark42/cmsf3qksa005u01sa2fk83j4u', name: 'Topography Light', editable: true },
    { id: 'idanstark42/cmsfwsqj700iy01s91xseeo19', name: 'Topography Dark', editable: true },
    { id: 'mapbox/satellite-v9', name: 'Satellite View', editable: false }
  ]

  static ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
}