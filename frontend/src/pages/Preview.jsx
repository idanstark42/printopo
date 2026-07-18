import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

export default function Preview() {
  const navigate = useNavigate()
  const [mockups, setMockups] = useState([])
  const [loading, setLoading] = useState(true)
  const { draftDesign, cart, setCart } = useStore()

  useEffect(() => {
    if (!draftDesign) {
      navigate('/editor')
      return
    }
    
    // Simulating the backend POST to /printify/preview
    setTimeout(() => {
      setMockups([
        "https://via.placeholder.com/500x500/228B22/FFFFFF?text=Mockup+Angle+1",
        "https://via.placeholder.com/500x500/145214/FFFFFF?text=Mockup+Angle+2"
      ])
      setLoading(false)
    }, 1500)
  }, [draftDesign])

  const handleAddToCart = () => {
    setCart([...cart, { design: draftDesign, quantity: 1, mockups }])
  }

  const handleCartAndReturn = () => {
    handleAddToCart()
    navigate('/editor')
  }

  const handleCartAndCheckout = () => {
    handleAddToCart()
    navigate('/checkout')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-forest-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-forest-500 mb-4"></div>
        <p className="text-forest-900 font-bold animate-pulse">Rendering high-res topography...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-forest-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-forest-900">Review your masterpiece</h2>
          <Link to="/editor" className="text-forest-500 font-bold hover:underline">← Back to Editor</Link>
        </div>

        <div className="grid md:grid-cols-2 gap-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          
          {/* Mockup Images */}
          <div className="space-y-4">
            <img src={mockups[0]} alt="Main Preview" className="w-full rounded-lg shadow-sm" />
            <div className="flex gap-4">
              {mockups.map((img, i) => (
                <img key={i} src={img} className="w-24 h-24 rounded border cursor-pointer hover:border-forest-500" />
              ))}
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex flex-col justify-center">
            <h3 className="text-2xl font-bold mb-2">{draftDesign.title}</h3>
            <p className="text-gray-500 mb-6">{draftDesign.product_sku} • {draftDesign.width}" x {draftDesign.height}"</p>
            
            <div className="text-4xl font-black text-forest-900 mb-8">${draftDesign.price.toFixed(2)}</div>

            <div className="space-y-4">
              <button onClick={handleCartAndCheckout} className="w-full bg-forest-500 hover:bg-forest-900 text-white py-4 rounded font-bold shadow-md transition-colors">
                Add to Cart & Checkout
              </button>
              <button onClick={handleCartAndReturn} className="w-full bg-white border-2 border-forest-500 text-forest-900 hover:bg-forest-50 py-4 rounded font-bold transition-colors">
                Add to Cart & Create Another
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}