import { Plus, LogIn } from 'lucide-react'

export default function RoomBtn({ btnName, onClick }) {
  const getButtonStyles = () => {
    if (btnName === 'CREATE') {
      return "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
    }
    return "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.08)]"
  }

  const renderIcon = () => {
    const iconClass = "w-4 h-4 stroke-[2]"
    return btnName === 'CREATE' 
      ? <Plus className={iconClass} /> 
      : <LogIn className={iconClass} />
  }

  return (
    <div className="w-full md:w-auto">
      <button 
        id={btnName} 
        onClick={onClick}
        className={`h-12 w-full md:w-auto px-5 border rounded-xl cursor-pointer font-semibold text-xs tracking-wider transition-all duration-300 backdrop-blur-md flex items-center justify-center gap-2 select-none active:scale-95 ${getButtonStyles()}`}
      >
        {renderIcon()}
        {btnName}
      </button>
    </div>
  )
}
