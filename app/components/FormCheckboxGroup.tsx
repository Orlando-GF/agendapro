'use client'

interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  options: Option[]
  selected: string[]
  onChange: (values: string[]) => void
  erro?: string
}

export function FormCheckboxGroup({ label, options, selected, onChange, erro }: Props) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-3">
        {options.map(opt => (
          <label
            key={opt.value}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors ${
              selected.includes(opt.value)
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
      {erro && <p className="mt-1 text-sm text-red-600">{erro}</p>}
    </div>
  )
}
