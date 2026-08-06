import { useState } from 'react'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'

export default function Accordion({ title, children }) {
    const [isOpen, setIsOpen] = useState(false)

    return <>
      <div 
        className="flex justify-between items-center pt-4 pb-2 border-b border-gray-100 cursor-pointer mb-2 transition-colors hover:bg-gray-50" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <label className="block text-sm font-bold text-gray-700 cursor-pointer">{title}</label>
        <span className="text-gray-400 text-xs">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</span>
    </div>
      <div style={{ display: isOpen ? 'block' : 'none' }}>
        {children}
      </div>
    </>
}