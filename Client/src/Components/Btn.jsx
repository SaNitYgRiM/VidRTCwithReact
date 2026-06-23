import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react'

export default function Btn({ btnName, isActive, onClick }) {
  const renderIcon = () => {
    const iconClass = "w-6 h-6 stroke-[1.5] transition-transform duration-200 group-hover:scale-110"
    
    if (btnName === 'CameraBtn') {
      return isActive ? <Video className={iconClass} /> : <VideoOff className={iconClass} />
    }
    if (btnName === 'MicBtn') {
      return isActive ? <Mic className={iconClass} /> : <MicOff className={iconClass} />
    }
    if (btnName === 'hangUpBtn') {
      return <PhoneOff className={`${iconClass} fill-current`} />
    }
    return null
  }

  const getButtonStyles = () => {
    if (btnName === 'hangUpBtn') {
      return "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 hover:border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
    }
    if (isActive) {
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
    }
    return "bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800/60"
  }

  return (
    <button 
      id={btnName} 
      onClick={onClick}
      className={`group h-14 w-14 border rounded-2xl cursor-pointer flex items-center justify-center transition-all duration-300 backdrop-blur-md ${getButtonStyles()}`}
    >
      {renderIcon()}
    </button>
  )
}
