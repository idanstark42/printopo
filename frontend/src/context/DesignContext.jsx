import { createContext, useContext, useState } from 'react'

const DesignContext = createContext()

export function DesignProvider({ children }) {
  const [designs, setDesigns] = useState([])

  const saveDesign = (designData) => {
    const newDesign = { id: `design-${Date.now()}`, ...designData }
    setDesigns(prev => [...prev, newDesign])
    return newDesign.id
  }

  return (
    <DesignContext.Provider value={{ designs, saveDesign }}>
      {children}
    </DesignContext.Provider>
  )
}

export const useDesigns = () => useContext(DesignContext)