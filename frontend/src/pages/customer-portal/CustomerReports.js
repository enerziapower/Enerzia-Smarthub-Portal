import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, LogOut, Loader2, AlertCircle, Search,
  ArrowLeft, FileText, Download, Filter, ExternalLink,
  ChevronDown, ChevronUp, Calendar, User, MapPin, Eye
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CustomerReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedReport, setExpandedReport] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(null);

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

    loadReports(token);
  }, [navigate]);

  const loadReports = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/customer-portal/reports?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to load reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
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

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.report_no?.toLowerCase().includes(search.toLowerCase()) ||
      report.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      report.equipment_type?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || report.report_category === typeFilter;
    return matchesSearch && matchesType;
  });

  const getReportTypeBadge = (type) => {
    const badges = {
      test_report: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Test Report' },
      ir_thermography: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'IR Thermography' },
      calibration: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Calibration Certificate' },
      amc_report: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'AMC Report' },
      wcc: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'WCC' }
    };
    const badge = badges[type] || badges.test_report;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Draft' },
      submitted: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Submitted' },
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Approved' }
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const toggleExpand = (reportId) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const handleDownloadPdf = async (report) => {
    const token = localStorage.getItem('customer_token');
    setLoadingPdf(report.id);
    
    try {
      let pdfUrl = '';
      const category = report.report_category;
      
      // Use customer portal download endpoints (these validate customer access)
      if (category === 'amc_report') {
        pdfUrl = `${API}/api/customer-portal/download/amc-report/${report.id}?token=${token}`;
      } else if (category === 'test_report') {
        pdfUrl = `${API}/api/customer-portal/download/test-report/${report.id}?token=${token}`;
      } else if (category === 'ir_thermography') {
        pdfUrl = `${API}/api/customer-portal/download/ir-thermography/${report.id}?token=${token}`;
      } else if (category === 'wcc') {
        pdfUrl = `${API}/api/customer-portal/download/wcc/${report.id}?token=${token}`;
      } else if (category === 'calibration') {
        // Calibration might need its own endpoint - for now use direct
        pdfUrl = `${API}/api/calibration/${report.id}/pdf`;
      }
      
      if (pdfUrl) {
        const response = await fetch(pdfUrl);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${report.report_no || report.amc_no || report.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Record download in history
          await fetch(`${API}/api/customer-portal/downloads?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document_type: category,
              document_id: report.id,
              document_name: report.report_no || report.amc_no || 'Report'
            })
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          alert(errorData.detail || 'Failed to download PDF. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Error downloading PDF. Please try again.');
    } finally {
      setLoadingPdf(null);
    }
  };

  const getReportDetails = (report) => {
    const category = report.report_category;
    
    if (category === 'amc_report') {
      return {
        title: report.amc_no || 'AMC Report',
        subtitle: report.customer_name || report.customer_info?.customer_name || '',
        details: [
          { label: 'Contract Period', value: report.contract_details ? 
            `${new Date(report.contract_details.start_date).toLocaleDateString('en-IN')} - ${new Date(report.contract_details.end_date).toLocaleDateString('en-IN')}` : '-' },
          { label: 'Location', value: report.customer_info?.site_location || '-' },
          { label: 'Contact', value: report.customer_info?.contact_person || '-' },
        ]
      };
    } else if (category === 'test_report') {
      return {
        title: report.report_no || 'Test Report',
        subtitle: report.equipment_type || report.equipment_name || '',
        details: [
          { label: 'Test Date', value: report.test_date ? new Date(report.test_date).toLocaleDateString('en-IN') : '-' },
          { label: 'Equipment', value: report.equipment_name || '-' },
          { label: 'Customer', value: report.customer_name || '-' },
        ]
      };
    } else if (category === 'ir_thermography') {
      return {
        title: report.report_no || 'IR Thermography',
        subtitle: report.report_type || '',
        details: [
          { label: 'Survey Date', value: report.survey_date ? new Date(report.survey_date).toLocaleDateString('en-IN') : '-' },
          { label: 'Client', value: report.document_details?.client || '-' },
          { label: 'Location', value: report.document_details?.location || '-' },
        ]
      };
    } else if (category === 'wcc') {
      return {
        title: report.wcc_no || 'WCC',
        subtitle: report.customer_name || '',
        details: [
          { label: 'Date', value: report.date ? new Date(report.date).toLocaleDateString('en-IN') : '-' },
          { label: 'Project', value: report.project_name || '-' },
          { label: 'Work Done', value: report.work_description?.slice(0, 50) + '...' || '-' },
        ]
      };
    } else if (category === 'calibration') {
      return {
        title: report.certificate_no || 'Calibration',
        subtitle: report.customer_info?.customer_name || '',
        details: [
          { label: 'Calibration Date', value: report.calibration_date ? new Date(report.calibration_date).toLocaleDateString('en-IN') : '-' },
          { label: 'Due Date', value: report.next_due_date ? new Date(report.next_due_date).toLocaleDateString('en-IN') : '-' },
          { label: 'Equipment', value: report.equipment_name || '-' },
        ]
      };
    }
    
    return {
      title: report.report_no || 'Report',
      subtitle: '',
      details: []
    };
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
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{customer?.name}</p>
              <p className="text-slate-400 text-xs">{customer?.company_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            <Link 
              to="/customer-portal/dashboard" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link 
              to="/customer-portal/amcs" 
              className="py-3 text-slate-400 hover:text-white border-b-2 border-transparent text-sm font-medium whitespace-nowrap"
            >
              My AMC Contracts
            </Link>
            <Link 
              to="/customer-portal/reports" 
              className="py-3 text-emerald-400 border-b-2 border-emerald-400 text-sm font-medium whitespace-nowrap"
            >
              Reports & Documents
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link 
            to="/customer-portal/dashboard"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Reports & Documents
            </h2>
            <p className="text-slate-400 text-sm">Download test reports and certificates</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by report number, project, or equipment..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="test_report">Test Reports</option>
            <option value="ir_thermography">IR Thermography</option>
            <option value="calibration">Calibration Certificates</option>
            <option value="amc_report">AMC Reports</option>
            <option value="wcc">Work Completion Certificates</option>
          </select>
        </div>

        {/* Reports List */}
        {filteredReports.length > 0 ? (
          <div className="space-y-4">
            {filteredReports.map((report, idx) => {
              const details = getReportDetails(report);
              const isExpanded = expandedReport === report.id;
              
              return (
                <div 
                  key={report.id || idx}
                  className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-colors"
                >
                  {/* Report Header */}
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {getReportTypeBadge(report.report_category)}
                          {getStatusBadge(report.status)}
                          <span className="font-mono text-xs text-slate-400">
                            {details.title}
                          </span>
                        </div>
                        <h3 className="text-white font-medium">
                          {details.subtitle || report.equipment_type || report.report_type || 'Report'}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          {report.project_name || report.customer_name || 'Project'}
                        </p>
                        {report.created_at && (
                          <p className="text-slate-500 text-xs mt-2">
                            Created: {new Date(report.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPdf(report)}
                          disabled={loadingPdf === report.id}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                        >
                          {loadingPdf === report.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Download
                        </button>
                        <button
                          onClick={() => toggleExpand(report.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 bg-slate-800/50 p-5">
                      <h4 className="text-sm font-medium text-slate-300 mb-4">Report Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {details.details.map((detail, i) => (
                          <div key={i} className="bg-slate-700/50 rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">{detail.label}</p>
                            <p className="text-sm text-white">{detail.value}</p>
                          </div>
                        ))}
                      </div>
                      
                      {/* Additional Info based on report type */}
                      {report.report_category === 'amc_report' && report.service_visits && (
                        <div className="mt-4">
                          <p className="text-xs text-slate-500 mb-2">Service Visits: {report.service_visits.length}</p>
                        </div>
                      )}
                      
                      {report.report_category === 'test_report' && report.test_results && (
                        <div className="mt-4">
                          <p className="text-xs text-slate-500 mb-2">
                            Test Result: <span className={report.test_results.overall_status === 'pass' ? 'text-green-400' : 'text-red-400'}>
                              {report.test_results.overall_status?.toUpperCase() || 'N/A'}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-white font-medium mb-2">No Reports Found</h3>
            <p className="text-slate-400 text-sm">
              {search || typeFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'You don\'t have any reports available yet'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerReports;
