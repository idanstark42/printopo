export default function NumberControl ({ label, value, onChange, min = 0, max = 20, step = 0.1 }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
        <input
          type="number" max={max} min={min} step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 p-1 text-xs border border-gray-300 rounded text-center font-mono"
        />
      </div>
      <input
        type="range" max={max} min={min} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-forest-500"
      />
    </div>
  )
}