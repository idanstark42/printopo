import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-forest-50 text-forest-900 font-sans selection:bg-forest-500 selection:text-white map-background">
      {/* Navigation */}
      <nav className="p-6 max-w-6xl mx-auto flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tighter text-forest-900">Printopo.</h1>
        <Link to="/login" className="px-5 py-2 font-semibold text-forest-900 border-2 border-forest-900 rounded hover:bg-forest-900 hover:text-white transition-colors">
          Sign In
        </Link>
      </nav>
      
      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center mt-24 px-4 text-center">
        <h2 className="text-6xl md:text-7xl font-black mb-6 leading-tight max-w-4xl text-forest-900">
          Wear your world. <br/> <span className="text-forest-500">Map your memories.</span>
        </h2>
        <p className="text-xl text-forest-700 mb-10 max-w-2xl">
          Search any location on Earth, frame the exact topographic lines, and print it on high-quality home decor. 
        </p>
        <Link 
          to="/editor" 
          className="px-10 py-5 bg-forest-500 hover:bg-forest-900 text-white rounded-lg text-xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
        >
          Start Designing
        </Link>
      </main>
    </div>
  )
}