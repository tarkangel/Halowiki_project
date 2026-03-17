interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-zinc-500 select-none pointer-events-none">🔍</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-[#00B4D8] transition-colors duration-200"
      />
    </div>
  );
}
