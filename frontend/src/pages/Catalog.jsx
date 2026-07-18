import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../context/StoreContext'

const BACKEND = 'http://127.0.0.1:8000'

export default function Catalog() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [mockups, setMockups] = useState([])
  const { draftDesign, setDraftDesign, cart, setUser } = useStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    
    fetchCatalog()
  }, [])

  // Use Printify's "brand" field as our categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean))
    return ['All', ...Array.from(uniqueCategories).sort()]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, activeCategory])

  const handleSelectProduct = async (blueprintId) => {
    console.log(draftDesign)
    if (!draftDesign.fileId) {
      alert("Missing Artwork File ID. Please save your map first!")
      return
    }
    setGenerating(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const detailsResponse = await fetch(`${BACKEND}/printify/prdouct-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blueprint_id: blueprintId // Sending the actual Printify blueprint ID now
        })
      })

      if (!detailsResponse.ok) throw new Error("Failed to load product details")

      const details = await detailsResponse.json()
      console.log(details)
      const productCreateResponse = await fetch(`${BACKEND}/printify/prdouct-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blueprint_id: blueprintId // Sending the actual Printify blueprint ID now
        })
      })

      if (!productResponse.ok) throw new Error("Failed to generate product")

      const product = await productResponse.json()
      console.log(product)
      
    } catch (error) {
      console.error(error)
      alert("Something went wrong generating the mockups.")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="p-10 text-center text-gray-500">Loading live catalog...</div>

  return (
    <div className="max-w-6xl mx-auto p-8">
      {mockups.length === 0 ? (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Choose Your Canvas</h1>
            <p className="text-gray-600 mb-6">Select a product from our live catalog to map your design onto.</p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-between shadow-lg items-center bg-white/70 p-4 rounded-xl border border-gray-100">
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === category 
                        ? 'bg-forest-900 text-white' 
                        : 'bg-white/70 text-gray-600 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="w-full md:w-72 shrink-0">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
                />
              </div>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((item) => (
                <div 
                  key={item.id} 
                  className={`rounded-xl p-6 transition flex flex-col shadow-lg items-center text-center bg-white/50 ${
                    generating ? 'opacity-50 cursor-not-allowed' : 'hover:border-forest-900'
                  }`}
                >
                  <div className="w-full aspect-square bg-white/50 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {/* Render the actual Printify Blueprint Thumbnail */}
                    {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-gray-400">No Image</span>
                    )}
                  </div>
                  <div className="flex flex-col flex-grow w-full justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 leading-tight mb-1 text-sm">{item.title}</h3>
                    </div>
                    <button 
                      onClick={() => !generating && handleSelectProduct(item.id)}
                      disabled={generating}
                      className="mt-4 px-4 py-2 bg-forest-900 text-white text-sm rounded-md cursor-pointer w-full disabled:bg-gray-400 transition-colors"
                    >
                      {generating ? "Generating..." : "Preview"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No products found matching "{searchQuery}".
            </div>
          )}
        </>
      ) : (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Design is Ready!</h2>
            <button 
              onClick={() => setMockups([])}
              className="text-sm font-medium text-forest-500 hover:text-forest-900 transition-colors"
            >
              &larr; Choose a different product
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl">
            {mockups.map((src, index) => (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <img src={src} alt="Product Mockup" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <button className="px-10 py-4 bg-forest-500 hover:bg-blue-900 text-white rounded-full text-lg font-bold shadow-lg transition-transform hover:-translate-y-1">
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  )
}