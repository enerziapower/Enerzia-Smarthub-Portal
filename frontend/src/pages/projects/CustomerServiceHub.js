import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, FileText, Clock, ChevronRight,
  Zap, Wind, Flame, Camera, Snowflake, Lightbulb, Cog, Briefcase,
  Headphones, CheckCircle, AlertTriangle
} from 'lucide-react';

// Service categories with their details
const SERVICE_CATEGORIES = [
  {
    id: 'electrical',
    name: 'Electrical',
    icon: Zap,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    description: 'Electrical systems maintenance, repairs and testing'
  },
  {
    id: 'hvac-systems',
    name: 'HVAC Systems',
    icon: Wind,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Heating, ventilation and air conditioning services'
  },
  {
    id: 'fire-protection',
    name: 'Fire Protection Systems',
    icon: Flame,
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-700',
    description: 'Fire alarm, suppression and safety systems'
  },
  {
    id: 'cctv-systems',
    name: 'CCTV Systems',
    icon: Camera,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    description: 'Surveillance and security camera systems'
  },
  {
    id: 'air-condition',
    name: 'Air Condition',
    icon: Snowflake,
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    description: 'Air conditioning units and cooling systems'
  },
  {
    id: 'lighting',
    name: 'Lighting',
    icon: Lightbulb,
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    description: 'Lighting systems, fixtures and controls'
  },
  {
    id: 'diesel-generator',
    name: 'Diesel Generator',
    icon: Cog,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    description: 'DG sets, backup power and generator services'
  },
  {
    id: 'general',
    name: 'General Services',
    icon: Briefcase,
    color: 'bg-slate-600',
    lightColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    description: 'General purpose visits without equipment testing'
  }
];

const CustomerServiceHub = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId) => {
    // Navigate to service requests filtered by this category
    navigate(`/projects/customer-service/category/${categoryId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Service</h1>
          <p className="text-slate-500 mt-1">Manage service calls and complaints by category</p>
        </div>
        <Link
          to="/projects/customer-service/all"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          data-testid="view-all-requests"
        >
          <FileText size={18} />
          View All Requests
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded-lg">
              <Headphones size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900">--</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">--</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <AlertTriangle size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">--</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">--</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Categories Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Categories</h2>
        <p className="text-slate-500 text-sm mb-6">Select a category to view and manage service requests</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                data-testid={`category-${category.id}`}
              >
                {/* Card Header with Icon */}
                <div className={`${category.lightColor} p-5 border-b border-slate-100`}>
                  <div className="flex items-center gap-4">
                    <div className={`${category.color} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{category.name}</h3>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-sm text-slate-600 mb-4 min-h-[40px]">
                    {category.description}
                  </p>

                  {/* View Button */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">View Requests</span>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/projects/customer-service/all?action=new"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus size={18} />
            New Service Request
          </Link>
          <Link
            to="/projects/customer-service/all?status=Pending"
            className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <Clock size={18} />
            View Pending
          </Link>
          <Link
            to="/projects/customer-service/all?status=In Progress"
            className="flex items-center gap-2 px-4 py-2.5 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <AlertTriangle size={18} />
            View In Progress
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerServiceHub;

// Export categories for use in other components
export { SERVICE_CATEGORIES };
