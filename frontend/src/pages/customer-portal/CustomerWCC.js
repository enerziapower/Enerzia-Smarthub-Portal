import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, LogOut, Loader2, AlertCircle, Search,
  ArrowLeft, FileCheck, Download, ExternalLink
} from 'lucide-react';

const CustomerWCC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wccs, setWccs] = useState([]);
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

    loadWCCs(token);
  }, [navigate]);

  const loadWCCs = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/customer-portal/wcc?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        if (response.status === 403) {
          setError('WCC access is not enabled for your account');
          setLoading(false);
          return;
        }
        throw new Error('Failed to load WCCs');
      }

      const data = await response.json();
      setWccs(data.wcc || []);
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

  const filteredWccs = wccs.filter(wcc => {
    return wcc.wcc_no?.toLowerCase().includes(search.toLowerCase()) ||
           wcc.project_name?.toLowerCase().includes(search.toLowerCase());
  });

  const getStatusBadge = (status) => {
    const badges = {
      'draft': { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Draft' },
      'submitted': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Submitted' },
      'approved': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Approved' },
      'completed': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' }
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
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
            <Link to="/customer-portal/projects" className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap">My Projects</Link>
            <Link to="/customer-portal/amcs" className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap">AMC Contracts</Link>
            <Link to="/customer-portal/wcc" className="py-3 text-emerald-400 border-b-2 border-emerald-400 text-sm font-medium whitespace-nowrap">WCC</Link>
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
              Work Completion Certificates
            </h2>
            <p className="text-slate-400 text-sm">View and download your WCC documents</p>
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
              placeholder="Search by WCC number or project..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* WCC List */}
        {filteredWccs.length > 0 ? (
          <div className="space-y-4">
            {filteredWccs.map((wcc, idx) => (
              <div 
                key={wcc.id || idx}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-sm bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                        {wcc.wcc_no || 'WCC'}
                      </span>
                      {getStatusBadge(wcc.status)}
                    </div>
                    <h3 className="text-white font-medium">{wcc.project_name || 'Project'}</h3>
                    <p className="text-slate-400 text-sm mt-1">{wcc.client_name || ''}</p>
                    {wcc.created_at && (
                      <p className="text-slate-500 text-xs mt-2">
                        Created: {new Date(wcc.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {wcc.pdf_url && (
                      <a
                        href={wcc.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    )}
                    <Link
                      to={`/customer-portal/wcc/${wcc.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl">
            <FileCheck className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-white font-medium mb-2">No WCC Documents Found</h3>
            <p className="text-slate-400 text-sm">
              {search ? 'Try adjusting your search' : 'No work completion certificates available yet'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerWCC;
