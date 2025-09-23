'use client'

import { useEffect, useState } from 'react'

interface MetricProps {
  label: string
  value: string
  percentage: number
  color: string
  delay?: number
}

function AnimatedMetric({ label, value, percentage, color, delay = 0 }: MetricProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, delay)

    return () => clearTimeout(timer)
  }, [percentage, delay])

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`font-semibold text-sm ${color}`}>{value}</span>
      </div>
      <div className="progress-bar">
        <div 
          className={`progress-fill ${color.replace('text-', 'bg-').replace('-600', '-500')}`}
          style={{ 
            width: `${animatedPercentage}%`,
            transitionDelay: `${delay}ms`
          }}
        />
      </div>
    </div>
  )
}

export default function PerformanceMetrics() {
  return (
    <div className="premium-card fade-in stagger-2">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white text-lg">📈</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
          <p className="text-sm text-gray-500">Real-time system performance</p>
        </div>
      </div>
      
      <div className="space-y-6">
        <AnimatedMetric
          label="Success Rate"
          value="94%"
          percentage={94}
          color="text-green-600"
          delay={200}
        />
        
        <AnimatedMetric
          label="Avg. Completion Time"
          value="2.3 min"
          percentage={76}
          color="text-blue-600"
          delay={400}
        />
        
        <AnimatedMetric
          label="AI Utilization"
          value="87%"
          percentage={87}
          color="text-purple-600"
          delay={600}
        />
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: Just now</span>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
            <span>Live</span>
          </div>
        </div>
      </div>
    </div>
  )
}
