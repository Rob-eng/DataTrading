import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  Bot, 
  TrendingUp, 
  Upload, 
  Home,
  Activity,
  Target
} from 'lucide-react'

const Sidebar: React.FC = () => {
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/advanced-analytics', icon: Target, label: 'Analytics Avançados' },
    { path: '/robots', icon: Bot, label: 'Robôs' },
    { path: '/operations', icon: TrendingUp, label: 'Operações' },
    { path: '/upload', icon: Upload, label: 'Upload' },
  ]

  return (
    <div className="w-64 bg-white shadow-lg h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">GPTrading</h1>
        </div>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar 