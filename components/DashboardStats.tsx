'use client'

import { useEffect, useState, ReactNode } from 'react'
import { ClipboardList, CheckCircle2, Target, Zap } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: ReactNode
  gradient: string
  delay?: number
}

function StatCard({ title, value, change, changeType, icon, gradient, delay = 0 }: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const changeColor = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  }[changeType]

  return (
    <div className={`premium-card group cursor-pointer ${isVisible ? 'scale-in' : 'opacity-0'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${changeColor}`}>
            <span className="mr-1">
              {changeType === 'positive' ? '↗' : changeType === 'negative' ? '↘' : '→'}
            </span>
            {change}
          </div>
        </div>
        <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Active Tasks"
        value="12"
        change="+3 from yesterday"
        changeType="positive"
        icon={<ClipboardList className="w-6 h-6" />}
        gradient="from-blue-500 to-blue-600"
        delay={0}
      />
      
      <StatCard
        title="Completed Today"
        value="8"
        change="+25% this week"
        changeType="positive"
        icon={<CheckCircle2 className="w-6 h-6" />}
        gradient="from-green-500 to-green-600"
        delay={100}
      />
      
      <StatCard
        title="Success Rate"
        value="94%"
        change="↗ 2% improvement"
        changeType="positive"
        icon={<Target className="w-6 h-6" />}
        gradient="from-purple-500 to-purple-600"
        delay={200}
      />
      
      <StatCard
        title="Avg Response"
        value="2.3s"
        change="Same as yesterday"
        changeType="neutral"
        icon={<Zap className="w-6 h-6" />}
        gradient="from-orange-500 to-orange-600"
        delay={300}
      />
    </div>
  )
}
