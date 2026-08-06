import { useState, useEffect } from 'react'
import { Map } from '../lib/map'

export default function Search({ onSelect }) {
  const [currentLocation, setCurrentLocation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2 || searchQuery.trim() === currentLocation?.place_name) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const typesParam = '&types=poi,place,locality,region,neighborhood';
        
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${Map.ACCESS_TOKEN}&autocomplete=true&limit=5${typesParam}`;
        
        const res = await fetch(url);
        const data = await res.json();
        if (data.features) {
          setSearchResults(data.features);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Error fetching geocoding suggestions:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (feature) => {
    const [lng, lat] = feature.center;
    setSearchQuery(feature.place_name);
    setShowDropdown(false);
    setCurrentLocation({ lng, lat, place_name: feature.place_name });
    onSelect({ lng, lat, place_name: feature.place_name });
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectLocation(searchResults[0]);
    }
  }

  return <form onSubmit={handleSearchSubmit} className="mb-4 relative">
    <div className="flex gap-2">
    <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
        className="flex-grow p-2 border border-gray-300 rounded focus:ring-1 focus:ring-forest-500 focus:border-forest-500 outline-none transition-all text-sm"
        placeholder="e.g. Central Park, NY"
    />
    <button type="submit" className="bg-forest-900 hover:bg-forest-700 text-white px-3 py-2 rounded font-bold transition-colors">Go</button>
    </div>

    {/* Autocomplete Dropdown */}
    {showDropdown && searchResults.length > 0 && (
    <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
        {searchResults.map((result) => (
        <li
            key={result.id}
            onClick={() => handleSelectLocation(result)}
            className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-none truncate"
        >
            {result.place_name}
        </li>
        ))}
    </ul>
    )}
  </form>
}