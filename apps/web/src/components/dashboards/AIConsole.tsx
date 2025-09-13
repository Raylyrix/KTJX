'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Brain, 
  Send, 
  Mic, 
  MicOff, 
  Loader2, 
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  Zap,
  Lightbulb,
  BarChart3
} from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  data?: any
}

// Mock data for demo
const mockSuggestions = [
  {
    id: 1,
    query: "Show me clients with >3 day response delays",
    icon: Clock,
    category: "Response Analysis"
  },
  {
    id: 2,
    query: "Summarize all finance-related emails this week",
    icon: MessageSquare,
    category: "Content Analysis"
  },
  {
    id: 3,
    query: "Which contacts have the highest engagement rates?",
    icon: Users,
    category: "Contact Analysis"
  },
  {
    id: 4,
    query: "Generate insights about our email patterns",
    icon: TrendingUp,
    category: "Insights"
  },
  {
    id: 5,
    query: "Compare this week's performance to last week",
    icon: BarChart3,
    category: "Performance"
  }
]

const mockChatHistory: ChatMessage[] = [
  {
    id: '1',
    type: 'user',
    content: 'Show me my top performing email campaigns',
    timestamp: new Date(Date.now() - 1000 * 60 * 30)
  },
  {
    id: '2',
    type: 'ai',
    content: 'Based on your email analytics, here are your top performing campaigns:',
    timestamp: new Date(Date.now() - 1000 * 60 * 29),
    data: {
      type: 'chart',
      title: 'Top Performing Campaigns',
      data: [
        { name: 'Q4 Product Launch', opens: 2450, clicks: 320, conversions: 45 },
        { name: 'Holiday Newsletter', opens: 1890, clicks: 280, conversions: 32 },
        { name: 'Client Onboarding', opens: 1670, clicks: 245, conversions: 28 }
      ]
    }
  }
]

export function AIConsole() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatHistory)
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const handleSendMessage = async () => {
    if (!query.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setQuery('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: getAIResponse(query),
        timestamp: new Date(),
        data: getResponseData(query)
      }
      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 2000)
  }

  const handleSuggestionClick = (suggestion: typeof mockSuggestions[0]) => {
    setQuery(suggestion.query)
  }

  const handleVoiceInput = () => {
    setIsListening(!isListening)
    // In a real app, this would integrate with speech-to-text
  }

  const getAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('response') && lowerQuery.includes('delay')) {
      return "I found 12 contacts with response delays over 3 days. Here's the breakdown:"
    }
    if (lowerQuery.includes('finance')) {
      return "Here's a summary of your finance-related emails from this week:"
    }
    if (lowerQuery.includes('engagement') || lowerQuery.includes('contact')) {
      return "Based on your contact analytics, here are the top engaged contacts:"
    }
    if (lowerQuery.includes('insight') || lowerQuery.includes('pattern')) {
      return "Here are some key insights about your email patterns:"
    }
    if (lowerQuery.includes('compare') || lowerQuery.includes('performance')) {
      return "Here's a comparison of this week vs last week:"
    }
    
    return "I've analyzed your request and here are the results:"
  }

  const getResponseData = (query: string): any => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('response') && lowerQuery.includes('delay')) {
      return {
        type: 'table',
        title: 'Contacts with Response Delays',
        data: [
          { contact: 'john.doe@company.com', delay: '4 days', lastContact: 'Jan 10' },
          { contact: 'jane.smith@business.com', delay: '5 days', lastContact: 'Jan 9' },
          { contact: 'bob.wilson@enterprise.com', delay: '3 days', lastContact: 'Jan 11' }
        ]
      }
    }
    if (lowerQuery.includes('engagement') || lowerQuery.includes('contact')) {
      return {
        type: 'chart',
        title: 'Top Engaged Contacts',
        data: [
          { name: 'Sarah Johnson', engagement: 95, emails: 45 },
          { name: 'Mike Chen', engagement: 87, emails: 32 },
          { name: 'Lisa Brown', engagement: 82, emails: 28 }
        ]
      }
    }
    
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            AI Console
          </h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your email data using natural language
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Beta
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat with AI
              </CardTitle>
              <CardDescription>
                Ask questions about your email analytics, contacts, and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        {message.data && (
                          <div className="mt-3 p-3 bg-white rounded border">
                            <h4 className="font-medium text-sm mb-2">{message.data.title}</h4>
                            {message.data.type === 'table' && (
                              <div className="space-y-1">
                                {message.data.data.map((row: any, index: number) => (
                                  <div key={index} className="text-xs flex justify-between">
                                    <span>{row.contact}</span>
                                    <span className="text-red-600">{row.delay}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.data.type === 'chart' && (
                              <div className="space-y-1">
                                {message.data.data.map((item: any, index: number) => (
                                  <div key={index} className="text-xs flex justify-between">
                                    <span>{item.name}</span>
                                    <span className="text-green-600">{item.engagement}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex space-x-2 mt-4">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about your email data..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleVoiceInput}
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!query.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Lightbulb className="h-4 w-4 mr-2" />
                Quick Suggestions
              </CardTitle>
              <CardDescription className="text-xs">
                Click to ask common questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-2">
                    <suggestion.icon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 line-clamp-2">
                        {suggestion.query}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {suggestion.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Zap className="h-4 w-4 mr-2" />
                AI Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Email Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Contact Insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Performance Trends</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Smart Replies</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Task Extraction</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
