import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, LogOut, Loader2, AlertCircle, Search,
  ArrowLeft, FolderKanban, ChevronRight, CheckCircle2, Clock
} from 'lucide-react';

const CustomerProjects = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');
    
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }

    if (customerInfo) {
      setCustomer(JSON.parse(customerInfo));
    }

    loadProjects(token);
  }, [navigate]);

  const loadProjects = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/customer-portal/projects?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to load projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    navigate('/customer-portal/login');
  };

  const filteredProjects = projects.filter(project => {
    return project.project_name?.toLowerCase().includes(search.toLowerCase()) ||
           project.pid_no?.toLowerCase().includes(search.toLowerCase());
  });

  const getStatusBadge = (status) => {
    const badges = {
      'Ongoing': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      'Completed': { bg: 'bg-green-500/20', text: 'text-green-400' },
      'On Hold': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
      'Cancelled': { bg: 'bg-red-500/20', text: 'text-red-400' }
    };
    const badge = badges[status] || { bg: 'bg-slate-500/20', text: 'text-slate-400' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Customer Portal
              </h1>
              <p className="text-slate-400 text-sm">Enerzia Power Solutions</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            <Link to="/customer-portal/dashboard" className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap">Dashboard</Link>
            <Link to="/customer-portal/projects" className="py-3 text-emerald-400 border-b-2 border-emerald-400 text-sm font-medium whitespace-nowrap">My Projects</Link>
            <Link to="/customer-portal/amcs" className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap">AMC Contracts</Link>
            <Link to="/customer-portal/wcc" className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap">WCC</Link>
            <Link to="/customer-portal/reports" className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap">Reports</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/customer-portal/dashboard" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              My Projects
            </h2>
            <p className="text-slate-400 text-sm">View your linked projects and progress</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Projects List */}
        {filteredProjects.length > 0 ? (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                to={`/customer-portal/projects/${project.id}`}
                className="block bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 text-slate-300">
                        {project.pid_no || 'N/A'}
                      </span>
                      {getStatusBadge(project.status)}
                    </div>
                    <h3 className="text-white font-medium text-lg">{project.project_name}</h3>
                    <p className="text-slate-400 text-sm mt-1">{project.location || project.client}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Progress */}
                    <div className="text-center p-3 bg-slate-900/50 rounded-lg min-w-[100px]">
                      <p className="text-xs text-slate-500 mb-1">Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500"
                            style={{ width: `${project.completion_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-white">{project.completion_percentage || 0}%</span>
                      </div>
                    </div>

                    {/* Document Counts */}
                    <div className="flex gap-2">
                      <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                        <p className="text-lg font-bold text-emerald-400">{project.amc_count || 0}</p>
                        <p className="text-xs text-slate-500">AMCs</p>
                      </div>
                      <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                        <p className="text-lg font-bold text-purple-400">{project.wcc_count || 0}</p>
                        <p className="text-xs text-slate-500">WCC</p>
                      </div>
                      <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                        <p className="text-lg font-bold text-blue-400">{project.report_count || 0}</p>
                        <p className="text-xs text-slate-500">Reports</p>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl">
            <FolderKanban className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-white font-medium mb-2">No Projects Found</h3>
            <p className="text-slate-400 text-sm">
              {search ? 'Try adjusting your search' : 'No projects have been linked to your account yet'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerProjects;
