import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Download, ArrowLeft, Loader2, Trash2, FileText,
  FileCheck, Clipboard, Thermometer, Calendar
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerDownloads = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloads, setDownloads] = useState([]);
  const [byType, setByType] = useState({});
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate('/customer-portal/login');
      return;
    }
    loadDownloads(token);
  }, [navigate]);

  const loadDownloads = async (token) => {
    try {
      const response = await fetch(`${API}/api/customer-portal/downloads?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/customer-portal/login');
          return;
        }
        throw new Error('Failed to load downloads');
      }

      const data = await response.json();
      setDownloads(data.downloads || []);
      setByType(data.by_type || {});
    } catch (err) {
      console.error('Error loading downloads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (downloadId) => {
    const token = localStorage.getItem('customer_token');
    try {
      await fetch(`${API}/api/customer-portal/downloads/${downloadId}?token=${token}`, {
        method: 'DELETE'
      });
      loadDownloads(token);
    } catch (err) {
      console.error('Error deleting download:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'amc_report': return <FileCheck className="w-5 h-5 text-blue-400" />;
      case 'test_report': return <FileText className="w-5 h-5 text-emerald-400" />;
      case 'wcc': return <Clipboard className="w-5 h-5 text-amber-400" />;
      case 'calibration': return <FileText className="w-5 h-5 text-purple-400" />;
      case 'ir_thermography': return <Thermometer className="w-5 h-5 text-red-400" />;
      default: return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      amc_report: 'AMC Report',
      test_report: 'Test Report',
      wcc: 'WCC',
      calibration: 'Calibration',
      ir_thermography: 'IR Thermography'
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return 'Today at ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredDownloads = filter === 'all' 
    ? downloads 
    : downloads.filter(d => d.document_type === filter);

  const typeOptions = Object.keys(byType);

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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            to="/customer-portal/dashboard"
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h1 className="text-white font-semibold">Download History</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{downloads.length}</p>
            <p className="text-sm text-slate-400">Total Downloads</p>
          </div>
          {typeOptions.slice(0, 3).map(type => (
            <div key={type} className="bg-slate-800 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{byType[type]?.length || 0}</p>
              <p className="text-sm text-slate-400">{getTypeLabel(type)}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'all' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All ({downloads.length})
          </button>
          {typeOptions.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === type 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {getTypeLabel(type)} ({byType[type]?.length || 0})
            </button>
          ))}
        </div>

        {/* Downloads List */}
        <div className="bg-slate-800 rounded-xl p-6">
          {filteredDownloads.length === 0 ? (
            <div className="text-center py-8">
              <Download className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No download history</p>
              <p className="text-sm text-slate-500 mt-1">Your downloaded documents will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDownloads.map((download) => (
                <div
                  key={download.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getIcon(download.document_type)}
                    <div>
                      <h3 className="text-white font-medium">{download.document_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 capitalize">
                          {getTypeLabel(download.document_type)}
                        </span>
                        <span className="text-xs text-slate-600">•</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(download.downloaded_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(download.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDownloads;
