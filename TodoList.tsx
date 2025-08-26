'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Clock, AlertTriangle } from 'lucide-react'

interface Todo {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  assignee: string
  dueDate: string
  complete: boolean
}

interface TodoListProps {
  todos?: Todo[]
}

export default function TodoList({ todos = [] }: TodoListProps) {
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  useEffect(() => {
    setLocalTodos(todos)
  }, [todos])

  const toggleComplete = (index: number) => {
    setLocalTodos(prev => prev.map((todo, i) => 
      i === index ? { ...todo, complete: !todo.complete } : todo
    ))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <Circle className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  const filteredTodos = localTodos.filter(todo => {
    if (filter === 'completed') return todo.complete
    if (filter === 'pending') return !todo.complete
    return true
  })

  const completedCount = localTodos.filter(todo => todo.complete).length
  const pendingCount = localTodos.filter(todo => !todo.complete).length

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">To-Do List</h2>
          <p className="text-sm text-gray-500">Track your tasks and priorities</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {completedCount} complete • {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({localTodos.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            filter === 'pending' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            filter === 'completed' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Todo Items */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'all' && 'No to-do items found'}
            {filter === 'pending' && 'No pending tasks'}
            {filter === 'completed' && 'No completed tasks'}
          </div>
        ) : (
          filteredTodos.map((todo, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all ${
                todo.complete 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => toggleComplete(index)}
                  className="mt-1 flex-shrink-0"
                >
                  {todo.complete ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                      {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {todo.assignee}
                    </span>
                  </div>
                  
                  <h3 className={`font-medium text-gray-900 mb-1 ${
                    todo.complete ? 'line-through text-gray-500' : ''
                  }`}>
                    {todo.title}
                  </h3>
                  
                  <p className={`text-sm mb-2 ${
                    todo.complete ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {todo.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Due: {todo.dueDate}</span>
                    {new Date(todo.dueDate) < new Date() && !todo.complete && (
                      <span className="text-red-600 font-medium">Overdue</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{localTodos.length}</div>
            <div className="text-xs text-gray-500">Total Tasks</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {localTodos.filter(todo => !todo.complete && new Date(todo.dueDate) < new Date()).length}
            </div>
            <div className="text-xs text-gray-500">Overdue</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {Math.round((completedCount / localTodos.length) * 100) || 0}%
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>
      </div>
    </div>
  )
}
