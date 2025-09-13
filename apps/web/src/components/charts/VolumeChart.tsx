'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Mock data - in real app, this would come from API
const mockData = [
  { date: '2024-01-01', sent: 120, received: 95 },
  { date: '2024-01-02', sent: 135, received: 110 },
  { date: '2024-01-03', sent: 98, received: 125 },
  { date: '2024-01-04', sent: 142, received: 88 },
  { date: '2024-01-05', sent: 156, received: 102 },
  { date: '2024-01-06', sent: 89, received: 145 },
  { date: '2024-01-07', sent: 167, received: 98 },
  { date: '2024-01-08', sent: 134, received: 112 },
  { date: '2024-01-09', sent: 145, received: 89 },
  { date: '2024-01-10', sent: 123, received: 134 },
  { date: '2024-01-11', sent: 156, received: 98 },
  { date: '2024-01-12', sent: 178, received: 145 },
  { date: '2024-01-13', sent: 134, received: 167 },
  { date: '2024-01-14', sent: 189, received: 123 },
  { date: '2024-01-15', sent: 145, received: 156 },
]

export function VolumeChart() {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#888"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis stroke="#888" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="sent" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name="Sent"
          />
          <Line 
            type="monotone" 
            dataKey="received" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            name="Received"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
