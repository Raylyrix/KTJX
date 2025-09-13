'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data - in real app, this would come from API
const mockData = [
  { date: '2024-01-01', sentiment: 0.2 },
  { date: '2024-01-02', sentiment: 0.1 },
  { date: '2024-01-03', sentiment: -0.1 },
  { date: '2024-01-04', sentiment: 0.3 },
  { date: '2024-01-05', sentiment: 0.4 },
  { date: '2024-01-06', sentiment: 0.2 },
  { date: '2024-01-07', sentiment: 0.1 },
  { date: '2024-01-08', sentiment: 0.0 },
  { date: '2024-01-09', sentiment: 0.2 },
  { date: '2024-01-10', sentiment: 0.3 },
  { date: '2024-01-11', sentiment: 0.1 },
  { date: '2024-01-12', sentiment: 0.4 },
  { date: '2024-01-13', sentiment: 0.2 },
  { date: '2024-01-14', sentiment: 0.3 },
  { date: '2024-01-15', sentiment: 0.5 },
]

export function SentimentChart() {
  const formatSentiment = (value: number) => {
    if (value > 0.1) return 'Positive'
    if (value < -0.1) return 'Negative'
    return 'Neutral'
  }

  const getSentimentColor = (value: number) => {
    if (value > 0.1) return '#10b981' // green
    if (value < -0.1) return '#ef4444' // red
    return '#6b7280' // gray
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#888"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            stroke="#888" 
            fontSize={12}
            domain={[-1, 1]}
            tickFormatter={(value) => value.toFixed(1)}
          />
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
            formatter={(value: number) => [
              formatSentiment(value),
              'Sentiment'
            ]}
          />
          <Area
            type="monotone"
            dataKey="sentiment"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#sentimentGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Sentiment Legend */}
      <div className="flex justify-center space-x-4 mt-4 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
          <span>Positive</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
          <span>Neutral</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
          <span>Negative</span>
        </div>
      </div>
    </div>
  )
}
