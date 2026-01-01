"use client"

import { useEffect, useState, useRef, useMemo } from "react"

interface Bulb {
  x: number
  y: number
  color: string
  waveDelay: number
  scale: number
  isMount: boolean
  swingDuration: number
  swingDelay: number
  swingAmp: number
}

const COLORS = [
  "#60A5FA",
  "#38BDF8",
  "#818CF8",
  "#A78BFA",
  "#C084FC",
]

export function Garland() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (typeof window !== "undefined") setWidth(window.innerWidth)

    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) setWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const { path, bulbs, mountPoints } = useMemo(() => {
    if (width === 0) return { path: "", bulbs: [], mountPoints: [] }

    const segmentTarget = 180 
    const segmentsCount = Math.max(Math.ceil(width / segmentTarget), 1)
    
    const points: {x: number, y: number}[] = [{x: 0, y: 0}]
    const segmentWidth = width / segmentsCount
    
    for (let i = 1; i < segmentsCount; i++) {
      points.push({
        x: i * segmentWidth + (Math.sin(i * 123) * 10),
        y: (Math.cos(i * 321) * 3)
      })
    }
    points.push({x: width, y: 0})

    let pathD = `M 0 0`
    const generatedBulbs: Bulb[] = []
    let globalBulbIndex = 0

    const addBulb = (x: number, y: number, isMount: boolean) => {
      const seed = globalBulbIndex * 137
      
      generatedBulbs.push({
        x,
        y: y + (isMount ? 6 : 0),
        color: COLORS[globalBulbIndex % COLORS.length],
        waveDelay: globalBulbIndex * 0.15,
        scale: 0.85 + (Math.sin(seed) * 0.1),
        isMount,
        swingDuration: 3 + Math.sin(seed) * 1, 
        swingDelay: Math.cos(seed) * 2,
        swingAmp: 5 + Math.sin(seed * 2) * 3 
      })
      globalBulbIndex++
    }

    addBulb(points[0].x, points[0].y, true)

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i+1]
      
      const dist = p2.x - p1.x
      const sag = 20 + (dist * 0.05)
      const midX = (p1.x + p2.x) / 2
      const cpY = Math.max(p1.y, p2.y) + 2 * sag 

      pathD += ` M ${p1.x} ${p1.y} Q ${midX} ${cpY} ${p2.x} ${p2.y}`

      const bulbsPerSegment = 4 
      
      for (let j = 1; j <= bulbsPerSegment; j++) {
        const t = j / (bulbsPerSegment + 1)
        
        const bx = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * midX + t * t * p2.x
        const by = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cpY + t * t * p2.y
        
        addBulb(bx, by, false)
      }

      if (i < points.length - 2) {
        addBulb(p2.x, p2.y, true)
      }
    }

    return { path: pathD, bulbs: generatedBulbs, mountPoints: points }
  }, [width])

  return (
    <div 
      ref={containerRef} 
      className="absolute top-full left-0 right-0 h-32 pointer-events-none z-40 overflow-hidden"
      aria-hidden="true"
    >
      {width > 0 && (
        <svg 
          className="w-full h-full"
          viewBox={`0 0 ${width} 128`} 
          style={{ overflow: 'visible' }}
        >
          <path
            d={path}
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="2"
            transform="translate(0, 3)"
          />
          <path
            d={path}
            fill="none"
            stroke="#2c394a" 
            strokeWidth="1.2"
          />

          {mountPoints.map((p, i) => (
              <circle key={`m-${i}`} cx={p.x} cy={p.y} r={2} fill="#475569" />
          ))}

          {bulbs.map((bulb, i) => (
            <g key={`b-${i}`} transform={`translate(${bulb.x}, ${bulb.y})`}>
              <g
                className="bulb-swing-wrapper"
                style={{
                    transform: `scale(${bulb.scale})`,
                    '--swing-duration': `${bulb.swingDuration}s`,
                    '--swing-delay': `${bulb.swingDelay}s`,
                    '--swing-amp': `${bulb.swingAmp}deg`,
                } as React.CSSProperties}
              >
                <line x1="0" y1="-2" x2="0" y2={bulb.isMount ? 0 : 3} stroke="#334155" strokeWidth="1" />
                
                <rect x="-2" y="3" width="4" height="5" fill="#1e293b" rx="0.5" />
                
                <g className="bulb-glow-group" style={{ 
                    animationDelay: `-${bulb.waveDelay}s`,
                  }}>
                  
                  <circle cx="0" cy="11" r="20" fill={bulb.color} className="opacity-[0.05] blur-xl" />
                  <circle cx="0" cy="11" r="10" fill={bulb.color} className="opacity-10 blur-md" />
                  <circle cx="0" cy="11" r="5" fill={bulb.color} className="opacity-30 blur-sm" />
                  
                  <path 
                    d="M -3 8 L 3 8 C 3 8 4.5 15 0 16 C -4.5 15 -3 8 -3 8 Z" 
                    fill={bulb.color}
                    className="opacity-90"
                  />
                  
                  <circle cx="-1" cy="10" r="1" fill="white" className="opacity-40" />
                </g>
              </g>
            </g>
          ))}
        </svg>
      )}

      <style jsx>{`
        .bulb-glow-group {
          animation: wave 3s ease-in-out infinite; 
        }
        
        .bulb-swing-wrapper {
          transform-origin: 0 -2px;
          animation: swing var(--swing-duration) ease-in-out infinite alternate;
          animation-delay: var(--swing-delay);
        }

        @keyframes wave {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        @keyframes swing {
          from { transform: scale(var(--bulb-scale, 1)) rotate(calc(var(--swing-amp) * -1)); }
          to { transform: scale(var(--bulb-scale, 1)) rotate(var(--swing-amp)); }
        }
        
        .blur-xl { filter: blur(12px); }
        .blur-md { filter: blur(6px); }
        .blur-sm { filter: blur(2px); }
      `}</style>
    </div>
  )
}
