import { createContext, useContext, useState } from 'react'

const ProductContext = createContext()

export function ProductProvider({ children }) {
  const [userProducts, setUserProducts] = useState([])

  const createUserProduct = (designId, productCatalogId) => {
    const newProduct = {
      id: `prod-${Date.now()}`,
      designId,
      productId: productCatalogId
    }
    setUserProducts(prev => [...prev, newProduct])
    return newProduct
  }

  return (
    <ProductContext.Provider value={{ userProducts, createUserProduct }}>
      {children}
    </ProductContext.Provider>
  )
}

export const useProducts = () => useContext(ProductContext)