'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data - in real app, this would come from API
const mockData = [
  { range: '0-1h', count: 45, percentage: 35 },
  { range: '1-4h', count: 32, percentage: 25 },
  { range: '4-24h', count: 28, percentage: 22 },
  { range: '1-3d', count: 15, percentage: 12 },
  { range: '3+ days', count: 8, percentage: 6 },
]

export function ResponseTimeChart() {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="range" 
            stroke="#888"
            fontSize={12}
          />
          <YAxis stroke="#888" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value, name) => [
              name === 'count' ? `${value} emails` : `${value}%`,
              name === 'count' ? 'Count' : 'Percentage'
            ]}
            labelFormatter={(label) => `Response Time: ${label}`}
          />
          <Bar 
            dataKey="count" 
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
