import { createContext, useContext, useState } from 'react'

const DraftDesignContext = createContext()

export const emptyDraftDesign = {
  title: 'my item',
  product: null,
  lng: -121.7600, 
  lat: 46.8500, 
  zoom: 11.00,
  bearing: 0,
  details: 50,
  style: 'idanstark42/cmsf3qksa005u01sa2fk83j4u',
}

export function DraftDesignProvider({ children }) {
  const [draftDesign, setDraftDesign] = useState(emptyDraftDesign)

  return (
    <DraftDesignContext.Provider value={{ draftDesign, setDraftDesign, emptyDraftDesign }}>
      {children}
    </DraftDesignContext.Provider>
  )
}

export const useDraftDesign = () => useContext(DraftDesignContext)