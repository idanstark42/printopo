import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { api } from '../lib/api'

export default function Checkout() {
  const { cart, setCart } = useStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // ... (updateQuantity and subtotal functions remain exactly the same)

  const handleProcessOrder = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Format the payload to match FastAPI CheckoutRequest model
      const payload = {
        cart_items: cart.map(item => ({
          design_id: item.design.printify_product_id, // Ensure your backend accepts this
          quantity: item.quantity
        })),
        shipping_address: {
          first_name: "Jane",
          last_name: "Doe",
          address1: "123 Map Street",
          city: "New York",
          country: "US",
          region: "NY",
          zip: "10001"
        }
      }

      // 2. Send to backend with a placeholder Stripe Intent ID
      // backend expects: process_purchase(checkout: CheckoutRequest, payment_intent_id: str)
      const paymentIntentId = "pi_mock_12345" 
      
      const response = await api.post(`/checkout/?payment_intent_id=${paymentIntentId}`, payload)
      
      // 3. Clear cart and show success
      alert("Order successful! " + response.message)
      setCart([])
      navigate('/editor')

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* ... (Cart mapping UI remains the same) ... */}
      
      <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-forest-500 h-fit">
        {/* ... (Summary UI remains the same) ... */}
        
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        
        <button 
          onClick={handleProcessOrder}
          disabled={loading || cart.length === 0}
          className="w-full bg-forest-900 hover:bg-black text-white font-bold py-4 rounded shadow-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Proceed to Stripe'}
        </button>
      </div>
    </div>
  )
}