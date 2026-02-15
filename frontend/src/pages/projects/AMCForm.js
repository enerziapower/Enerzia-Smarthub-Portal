import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Calendar, Building2,
  FileText, Settings, Clock, CheckCircle, Package, Search,
  X, Link, ExternalLink, Download, Eye, Unlink, Flame,
  Upload, File, Paperclip, Wrench, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '../../components/ui/date-picker';

const API = process.env.REACT_APP_BACKEND_URL;

const EQUIPMENT_TYPES = [
  { id: 'acb', name: 'ACB - Air Circuit Breaker' },
  { id: 'mccb', name: 'MCCB - Moulded Case Circuit Breaker' },
  { id: 'vcb', name: 'VCB - Vacuum Circuit Breaker' },
  { id: 'transformer', name: 'Transformer' },
  { id: 'dg', name: 'DG - Diesel Generator' },
  { id: 'ups', name: 'UPS - Uninterruptible Power Supply' },
  { id: 'electrical-panel', name: 'Electrical Panel' },
  { id: 'earth-pit', name: 'Earth Pit' },
  { id: 'energy-meter', name: 'Energy Meter' },
  { id: 'voltmeter', name: 'Voltmeter' },
  { id: 'ammeter', name: 'Ammeter' },
  { id: 'lightning-arrestor', name: 'Lightning Arrestor' },
  { id: 'relay', name: 'Relay' },
  { id: 'apfc', name: 'APFC Panel' }
];

const SERVICE_FREQUENCIES = [
  { id: 'monthly', name: 'Monthly' },
  { id: 'quarterly', name: 'Quarterly' },
  { id: 'half-yearly', name: 'Half-Yearly' },
  { id: 'yearly', name: 'Yearly' }
];

// IR Thermography Report Linking Modal Component
const LinkIRThermographyModal = ({ isOpen, onClose, onLink, visitIndex, linkedReportIds = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [irReports, setIRReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchIRReports();
    }
  }, [isOpen]);

  const fetchIRReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/test-reports?equipment_type=ir-thermography&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const reports = Array.isArray(data) ? data : (data.reports || data.test_reports || []);
        setIRReports(reports);
      }
    } catch (error) {
      console.error('Error fetching IR thermography reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = irReports.filter(report => {
    const matchesSearch = 
      report.report_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const isLinked = (reportId) => linkedReportIds.includes(reportId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Link IR Thermography Reports to Service Visit</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by report no, customer, location..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No IR thermography reports found. Create IR thermography reports from Audit Reports first.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <div 
                  key={report.id} 
                  className={`p-3 border rounded-lg flex items-center justify-between ${
                    isLinked(report.id) ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{report.report_no || `Report #${report.id?.slice(-6)}`}</span>
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full">
                        IR Thermography
                      </span>
                      {isLinked(report.id) && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> Linked
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {report.customer_name} • {report.location} • {report.test_date || report.created_at?.split('T')[0]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`${API}/api/ir-thermography-report/${report.id}/pdf`, '_blank')}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded"
                      title="View PDF"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => onLink(report.id, visitIndex, !isLinked(report.id))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isLinked(report.id)
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isLinked(report.id) ? (
                        <span className="flex items-center gap-1"><Unlink size={14} /> Unlink</span>
                      ) : (
                        <span className="flex items-center gap-1"><Link size={14} /> Link</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Service Report Linking Modal Component
const LinkServiceReportModal = ({ isOpen, onClose, onLink, visitIndex, linkedReportIds = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceReports, setServiceReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Service categories matching CustomerService.js
  const SERVICE_CATEGORIES = ['Electrical', 'HVAC Systems', 'Fire Protection Systems', 'CCTV Systems', 'Air Condition', 'Lighting', 'Diesel Generator', 'General Services'];

  useEffect(() => {
    if (isOpen) {
      fetchServiceReports();
    }
  }, [isOpen]);

  const fetchServiceReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Fetch from customer-service endpoint (Service Reports - Electrical, HVAC, Fire Protection, etc.)
      const response = await fetch(`${API}/api/customer-service`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const reports = Array.isArray(data) ? data : [];
        // Filter only completed service reports
        const completedReports = reports.filter(r => 
          r.status === 'Completed' || r.status === 'completed'
        );
        setServiceReports(completedReports);
      }
    } catch (error) {
      console.error('Error fetching service reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = serviceReports.filter(report => {
    const matchesSearch = 
      report.srn_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.service_category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || report.service_category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const isLinked = (reportId) => linkedReportIds.includes(reportId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Link Service Reports to Service Visit</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SRN no, customer, subject..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 text-xs rounded-full ${categoryFilter === 'all' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Categories
            </button>
            {SERVICE_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-xs rounded-full ${categoryFilter === cat ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No completed service reports found.</p>
              <p className="text-sm mt-1">Create service reports from the Service Reports menu first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <div 
                  key={report.id}
                  className={`p-3 rounded-lg border ${isLinked(report.id) ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{report.srn_no}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {report.service_category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          report.status === 'Completed' || report.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-700 font-medium">{report.subject}</div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span>{report.customer_name}</span>
                        <span>{report.service_date || report.reported_date}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLink(report.id, visitIndex, !isLinked(report.id))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        isLinked(report.id)
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isLinked(report.id) ? 'Unlink' : 'Link'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Test Report Linking Modal Component
const LinkTestReportModal = ({ isOpen, onClose, onLink, visitIndex, linkedReportIds = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [testReports, setTestReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchTestReports();
    }
  }, [isOpen, equipmentFilter]);

  const fetchTestReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/api/test-reports?limit=100`;
      if (equipmentFilter !== 'all') {
        url += `&equipment_type=${equipmentFilter}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const reports = Array.isArray(data) ? data : (data.reports || data.test_reports || []);
        setTestReports(reports);
      }
    } catch (error) {
      console.error('Error fetching test reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = testReports.filter(report => {
    const matchesSearch = 
      report.report_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.equipment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const isLinked = (reportId) => linkedReportIds.includes(reportId);

  const getEquipmentLabel = (type) => {
    const eq = EQUIPMENT_TYPES.find(e => e.id === type);
    return eq ? eq.name : type;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Link Test Reports to Service Visit</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by report no, customer, location..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Equipment Types</option>
            {EQUIPMENT_TYPES.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No test reports found. Create test reports from Equipment Test Reports first.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <div 
                  key={report.id} 
                  className={`p-3 border rounded-lg flex items-center justify-between ${
                    isLinked(report.id) ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{report.report_no || `Report #${report.id?.slice(-6)}`}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {getEquipmentLabel(report.equipment_type)}
                      </span>
                      {isLinked(report.id) && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle size={12} /> Linked
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {report.customer_name} • {report.location} • {report.test_date || report.created_at?.split('T')[0]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`${API}/api/equipment-report/${report.equipment_type}/${report.id}/pdf`, '_blank')}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded"
                      title="View PDF"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => onLink(report.id, visitIndex, !isLinked(report.id))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isLinked(report.id)
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isLinked(report.id) ? (
                        <span className="flex items-center gap-1"><Unlink size={14} /> Unlink</span>
                      ) : (
                        <span className="flex items-center gap-1"><Link size={14} /> Link</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Linked IR Thermography Reports Display Component
const LinkedIRReportsDisplay = ({ reportIds, onUnlink, visitIndex }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reportIds && reportIds.length > 0) {
      fetchLinkedReports();
    } else {
      setReports([]);
    }
  }, [reportIds]);

  const fetchLinkedReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fetchedReports = [];
      
      for (const reportId of reportIds) {
        try {
          // First try ir-thermography endpoint
          let response = await fetch(`${API}/api/ir-thermography/${reportId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          // If not found, try test-reports endpoint
          if (!response.ok) {
            response = await fetch(`${API}/api/test-reports/${reportId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          }
          
          if (response.ok) {
            const data = await response.json();
            fetchedReports.push(data);
          }
        } catch (e) {
          console.error('Error fetching IR report:', reportId);
        }
      }
      
      setReports(fetchedReports);
    } catch (error) {
      console.error('Error fetching linked IR reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading linked IR reports...</div>;
  }

  if (reports.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div key={report.id} className="flex items-center justify-between p-2 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-rose-600" />
            <span className="text-sm font-medium text-slate-700">
              {report.report_no || `Report #${report.id?.slice(-6)}`}
            </span>
            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-xs rounded">
              IR Thermography
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.open(`${API}/api/ir-thermography-report/${report.id}/pdf`, '_blank')}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="View PDF"
            >
              <ExternalLink size={16} />
            </button>
            <button
              type="button"
              onClick={() => onUnlink(report.id, visitIndex)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
              title="Unlink Report"
            >
              <Unlink size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Linked Service Reports Display Component
const LinkedServiceReportsDisplay = ({ reportIds, onUnlink, visitIndex }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reportIds && reportIds.length > 0) {
      fetchLinkedReports();
    } else {
      setReports([]);
    }
  }, [reportIds]);

  const fetchLinkedReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fetchedReports = [];
      
      for (const id of reportIds) {
        try {
          // Fetch from customer-service endpoint (Service Reports - Electrical, HVAC, etc.)
          const response = await fetch(`${API}/api/customer-service/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const report = await response.json();
            fetchedReports.push(report);
          }
        } catch (error) {
          console.error(`Error fetching service report ${id}:`, error);
        }
      }
      
      setReports(fetchedReports);
    } catch (error) {
      console.error('Error fetching linked service reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading linked service reports...</div>;
  }

  if (reports.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div key={report.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-green-600" />
            <span className="text-sm font-medium text-slate-700">
              {report.srn_no || `Report #${report.id?.slice(-6)}`}
            </span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
              {report.service_category || 'Service'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.open(`/projects/service-reports/${report.id}/view`, '_blank')}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="View Report"
            >
              <ExternalLink size={16} />
            </button>
            <button
              type="button"
              onClick={() => onUnlink(report.id, visitIndex)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
              title="Unlink Report"
            >
              <Unlink size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Linked Reports Display Component
const LinkedReportsDisplay = ({ reportIds, onUnlink, visitIndex }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reportIds && reportIds.length > 0) {
      fetchLinkedReports();
    } else {
      setReports([]);
    }
  }, [reportIds]);

  const fetchLinkedReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fetchedReports = [];
      
      for (const reportId of reportIds) {
        try {
          const response = await fetch(`${API}/api/test-reports/${reportId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            fetchedReports.push(data);
          }
        } catch (e) {
          console.error('Error fetching report:', reportId);
        }
      }
      
      setReports(fetchedReports);
    } catch (error) {
      console.error('Error fetching linked reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentLabel = (type) => {
    const eq = EQUIPMENT_TYPES.find(e => e.id === type);
    return eq ? eq.name : type;
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading linked reports...</div>;
  }

  if (reports.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div key={report.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-green-600" />
            <span className="text-sm font-medium text-slate-700">
              {report.report_no || `Report #${report.id?.slice(-6)}`}
            </span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
              {getEquipmentLabel(report.equipment_type)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.open(`${API}/api/equipment-report/${report.equipment_type}/${report.id}/pdf`, '_blank')}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="View PDF"
            >
              <ExternalLink size={16} />
            </button>
            <button
              type="button"
              onClick={() => onUnlink(report.id, visitIndex)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
              title="Unlink Report"
            >
              <Unlink size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const AMCForm = () => {
  const navigate = useNavigate();
  const { amcId } = useParams();
  const isEdit = Boolean(amcId);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('AS'); // Default to Asset Services
  const [activeTab, setActiveTab] = useState('details');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [irLinkModalOpen, setIRLinkModalOpen] = useState(false);
  const [serviceLinkModalOpen, setServiceLinkModalOpen] = useState(false);
  const [selectedVisitIndex, setSelectedVisitIndex] = useState(null);
  
  const [formData, setFormData] = useState({
    project_id: '',
    status: 'active',
    contract_details: {
      contract_no: '',
      start_date: '',
      end_date: '',
      contract_value: '',
      payment_terms: '',
      scope_of_work: '',
      special_conditions: ''
    },
    customer_info: {
      customer_name: '',
      site_location: '',
      contact_person: '',
      contact_number: '',
      email: ''
    },
    service_provider: {
      company_name: 'Enerzia Power Solutions',
      address: '',
      contact_person: '',
      contact_number: '',
      email: '',
      gstin: ''
    },
    equipment_list: [],
    service_visits: [],
    document_details: {
      revision: '00',
      prepared_by: '',
      approved_by: ''
    },
    spare_consumables: [],
    statutory_documents: [],
    annexure: []
  });

  useEffect(() => {
    fetchProjects();
    if (isEdit) {
      fetchAMC();
    }
  }, [amcId, projectFilter]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch projects based on category filter
      let url = `${API}/api/projects`;
      if (projectFilter && projectFilter !== 'all') {
        url += `?category=${projectFilter}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with projects key
        const projectList = Array.isArray(data) ? data : (data.projects || []);
        setProjects(projectList);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchAMC = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/amc/${amcId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({
          ...formData,
          project_id: data.project_id || '',
          status: data.status || 'active',
          contract_details: data.contract_details || formData.contract_details,
          customer_info: data.customer_info || formData.customer_info,
          service_provider: data.service_provider || formData.service_provider,
          equipment_list: data.equipment_list || [],
          service_visits: data.service_visits || [],
          document_details: data.document_details || formData.document_details,
          spare_consumables: data.spare_consumables || [],
          statutory_documents: data.statutory_documents || [],
          annexure: data.annexure || []
        });
      }
    } catch (error) {
      console.error('Error fetching AMC:', error);
      toast.error('Failed to load AMC');
    } finally {
      setLoading(false);
    }
  };

  const handleContractChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contract_details: {
        ...prev.contract_details,
        [field]: value
      }
    }));
  };

  const handleCustomerInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      customer_info: {
        ...prev.customer_info,
        [field]: value
      }
    }));
  };

  const handleServiceProviderChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      service_provider: {
        ...prev.service_provider,
        [field]: value
      }
    }));
  };

  const handleDocumentDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      document_details: {
        ...prev.document_details,
        [field]: value
      }
    }));
  };

  const addEquipment = () => {
    setFormData(prev => ({
      ...prev,
      equipment_list: [
        ...prev.equipment_list,
        {
          equipment_type: '',
          equipment_name: '',
          quantity: 1,
          service_frequency: 'quarterly',
          last_service_date: '',
          next_service_date: ''
        }
      ]
    }));
  };

  const updateEquipment = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.equipment_list];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, equipment_list: updated };
    });
  };

  const removeEquipment = (index) => {
    setFormData(prev => ({
      ...prev,
      equipment_list: prev.equipment_list.filter((_, i) => i !== index)
    }));
  };

  const addServiceVisit = () => {
    setFormData(prev => ({
      ...prev,
      service_visits: [
        ...prev.service_visits,
        {
          visit_id: `visit_${Date.now()}`,
          visit_date: '',
          visit_type: 'scheduled',
          status: 'scheduled',
          equipment_serviced: [],
          technician_name: '',
          remarks: '',
          test_report_ids: [],
          ir_thermography_report_ids: [],
          service_report_ids: []
        }
      ]
    }));
  };

  const updateServiceVisit = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.service_visits];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, service_visits: updated };
    });
  };

  const removeServiceVisit = (index) => {
    setFormData(prev => ({
      ...prev,
      service_visits: prev.service_visits.filter((_, i) => i !== index)
    }));
  };

  // Open modal to link test reports
  const openLinkModal = (visitIndex) => {
    setSelectedVisitIndex(visitIndex);
    setLinkModalOpen(true);
  };

  // Open modal to link IR thermography reports
  const openIRLinkModal = (visitIndex) => {
    setSelectedVisitIndex(visitIndex);
    setIRLinkModalOpen(true);
  };

  // Handle linking/unlinking test reports
  const handleLinkTestReport = (reportId, visitIndex, shouldLink) => {
    setFormData(prev => {
      const updatedVisits = [...prev.service_visits];
      const currentReportIds = updatedVisits[visitIndex].test_report_ids || [];
      
      if (shouldLink) {
        // Add report ID if not already linked
        if (!currentReportIds.includes(reportId)) {
          updatedVisits[visitIndex] = {
            ...updatedVisits[visitIndex],
            test_report_ids: [...currentReportIds, reportId]
          };
        }
      } else {
        // Remove report ID
        updatedVisits[visitIndex] = {
          ...updatedVisits[visitIndex],
          test_report_ids: currentReportIds.filter(id => id !== reportId)
        };
      }
      
      return { ...prev, service_visits: updatedVisits };
    });
    
    toast.success(shouldLink ? 'Test report linked' : 'Test report unlinked');
  };

  // Handle unlinking from display component
  const handleUnlinkReport = (reportId, visitIndex) => {
    handleLinkTestReport(reportId, visitIndex, false);
  };

  // Handle linking/unlinking IR thermography reports
  const handleLinkIRReport = (reportId, visitIndex, shouldLink) => {
    if (visitIndex === null || visitIndex === undefined) {
      console.error('handleLinkIRReport: visitIndex is null or undefined');
      return;
    }
    
    setFormData(prev => {
      const updatedVisits = [...prev.service_visits];
      
      if (!updatedVisits[visitIndex]) {
        console.error('handleLinkIRReport: no visit at index', visitIndex);
        return prev;
      }
      
      const currentReportIds = updatedVisits[visitIndex].ir_thermography_report_ids || [];
      
      if (shouldLink) {
        if (!currentReportIds.includes(reportId)) {
          updatedVisits[visitIndex] = {
            ...updatedVisits[visitIndex],
            ir_thermography_report_ids: [...currentReportIds, reportId]
          };
        }
      } else {
        updatedVisits[visitIndex] = {
          ...updatedVisits[visitIndex],
          ir_thermography_report_ids: currentReportIds.filter(id => id !== reportId)
        };
      }
      
      return { ...prev, service_visits: updatedVisits };
    });
    
    toast.success(shouldLink ? 'IR thermography report linked' : 'IR thermography report unlinked');
  };

  // Handle unlinking IR reports from display component
  const handleUnlinkIRReport = (reportId, visitIndex) => {
    handleLinkIRReport(reportId, visitIndex, false);
  };

  // Open service report link modal
  const openServiceLinkModal = (visitIndex) => {
    setSelectedVisitIndex(visitIndex);
    setServiceLinkModalOpen(true);
  };

  // Handle linking/unlinking service reports
  const handleLinkServiceReport = (reportId, visitIndex, shouldLink) => {
    if (visitIndex === null || visitIndex === undefined) {
      console.error('handleLinkServiceReport: visitIndex is null or undefined');
      return;
    }
    
    setFormData(prev => {
      const updatedVisits = [...prev.service_visits];
      
      if (!updatedVisits[visitIndex]) {
        console.error('handleLinkServiceReport: no visit at index', visitIndex);
        return prev;
      }
      
      const currentReportIds = updatedVisits[visitIndex].service_report_ids || [];
      
      if (shouldLink) {
        if (!currentReportIds.includes(reportId)) {
          updatedVisits[visitIndex] = {
            ...updatedVisits[visitIndex],
            service_report_ids: [...currentReportIds, reportId]
          };
        }
      } else {
        updatedVisits[visitIndex] = {
          ...updatedVisits[visitIndex],
          service_report_ids: currentReportIds.filter(id => id !== reportId)
        };
      }
      
      return { ...prev, service_visits: updatedVisits };
    });
    
    toast.success(shouldLink ? 'Service report linked' : 'Service report unlinked');
  };

  // Handle unlinking service reports from display component
  const handleUnlinkServiceReport = (reportId, visitIndex) => {
    handleLinkServiceReport(reportId, visitIndex, false);
  };

  const addAnnexure = () => {
    setFormData(prev => ({
      ...prev,
      annexure: [
        ...prev.annexure,
        { title: '', description: '' }
      ]
    }));
  };

  const updateAnnexure = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.annexure];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, annexure: updated };
    });
  };

  const removeAnnexure = (index) => {
    setFormData(prev => ({
      ...prev,
      annexure: prev.annexure.filter((_, i) => i !== index)
    }));
  };

  // Spare & Consumables functions
  const addSpareConsumable = () => {
    setFormData(prev => ({
      ...prev,
      spare_consumables: [
        ...prev.spare_consumables,
        {
          item_name: '',
          item_type: 'spare', // spare or consumable
          quantity: 1,
          unit: 'nos',
          part_number: '',
          used_date: '',
          remarks: ''
        }
      ]
    }));
  };

  const updateSpareConsumable = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.spare_consumables];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, spare_consumables: updated };
    });
  };

  const removeSpareConsumable = (index) => {
    setFormData(prev => ({
      ...prev,
      spare_consumables: prev.spare_consumables.filter((_, i) => i !== index)
    }));
  };

  // Statutory Documents functions
  const addStatutoryDocument = () => {
    setFormData(prev => ({
      ...prev,
      statutory_documents: [
        ...prev.statutory_documents,
        {
          document_type: 'calibration_certificate',
          document_name: '',
          reference_no: '',
          issue_date: '',
          expiry_date: '',
          file_url: '',
          file_name: ''
        }
      ]
    }));
  };

  const updateStatutoryDocument = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.statutory_documents];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, statutory_documents: updated };
    });
  };

  const removeStatutoryDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      statutory_documents: prev.statutory_documents.filter((_, i) => i !== index)
    }));
  };

  // File upload handler for statutory documents
  const handleFileUpload = async (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type (PDF only for statutory documents)
    if (file.type !== 'application/pdf') {
      toast.error('Please upload PDF files only');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('category', 'statutory_document');

      const response = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        updateStatutoryDocument(index, 'file_url', data.file_url || data.url);
        updateStatutoryDocument(index, 'file_name', file.name);
        toast.success('Document uploaded successfully');
      } else {
        toast.error('Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }
    
    if (!formData.contract_details.start_date || !formData.contract_details.end_date) {
      toast.error('Please enter contract start and end dates');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = isEdit ? `${API}/api/amc/${amcId}` : `${API}/api/amc`;
      const method = isEdit ? 'PUT' : 'POST';
      
      // Clean up data - convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        contract_details: {
          ...formData.contract_details,
          contract_value: formData.contract_details.contract_value 
            ? parseFloat(formData.contract_details.contract_value) 
            : null,
          payment_terms: formData.contract_details.payment_terms || null,
          scope_of_work: formData.contract_details.scope_of_work || null,
          special_conditions: formData.contract_details.special_conditions || null
        },
        customer_info: {
          customer_name: formData.customer_info.customer_name || '',
          site_location: formData.customer_info.site_location || '',
          contact_person: formData.customer_info.contact_person || '',
          contact_number: formData.customer_info.contact_number || '',
          email: formData.customer_info.email || ''
        },
        service_provider: {
          company_name: formData.service_provider.company_name || 'Enerzia Power Solutions',
          address: formData.service_provider.address || '',
          contact_person: formData.service_provider.contact_person || '',
          contact_number: formData.service_provider.contact_number || '',
          email: formData.service_provider.email || '',
          gstin: formData.service_provider.gstin || ''
        }
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      });
      
      if (response.ok) {
        toast.success(isEdit ? 'AMC updated successfully' : 'AMC created successfully');
        navigate('/projects/amc');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save AMC');
      }
    } catch (error) {
      console.error('Error saving AMC:', error);
      toast.error('Failed to save AMC');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'details', name: 'Contract Details', icon: FileText },
    { id: 'customer', name: 'Customer Info', icon: Users },
    { id: 'provider', name: 'Service Provider', icon: Building2 },
    { id: 'equipment', name: 'Equipment List', icon: Package },
    { id: 'visits', name: 'Service Visits', icon: Calendar },
    { id: 'spare', name: 'Spare & Consumables', icon: Wrench },
    { id: 'statutory', name: 'Statutory Documents', icon: Paperclip }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="amc-form-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects/amc')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEdit ? 'Edit AMC' : 'Create New AMC'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isEdit ? 'Update AMC details' : 'Set up a new Annual Maintenance Contract'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          data-testid="save-amc-btn"
        >
          {saving ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Save size={20} />
          )}
          {saving ? 'Saving...' : 'Save AMC'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Contract Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Project Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Project Category
                  </label>
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AS">Asset Services (AS)</option>
                    <option value="PSS">Power System Services (PSS)</option>
                    <option value="all">All Projects</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    data-testid="project-select"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.pid_no} - {project.project_name} ({project.client})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {projects.length} projects found in {projectFilter === 'all' ? 'all categories' : projectFilter}
                  </p>
                </div>
              </div>

              {/* Contract Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contract No</label>
                  <input
                    type="text"
                    value={formData.contract_details.contract_no}
                    onChange={(e) => handleContractChange('contract_no', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="AMC-2024-001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.contract_details.start_date}
                    onChange={(val) => handleContractChange('start_date', val)}
                    placeholder="Select start date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.contract_details.end_date}
                    onChange={(val) => handleContractChange('end_date', val)}
                    placeholder="Select end date"
                    className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contract Value</label>
                  <input
                    type="number"
                    value={formData.contract_details.contract_value}
                    onChange={(e) => handleContractChange('contract_value', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="renewed">Renewed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.contract_details.payment_terms}
                    onChange={(e) => handleContractChange('payment_terms', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Quarterly advance"
                  />
                </div>
              </div>

              {/* Scope of Work */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scope of Work</label>
                <textarea
                  value={formData.contract_details.scope_of_work}
                  onChange={(e) => handleContractChange('scope_of_work', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the scope of maintenance services..."
                />
              </div>

              {/* Special Conditions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Conditions</label>
                <textarea
                  value={formData.contract_details.special_conditions}
                  onChange={(e) => handleContractChange('special_conditions', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special terms or conditions..."
                />
              </div>
            </div>
          )}

          {/* Customer Information Tab */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">Customer Information</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Enter the customer details that will appear in the PDF report.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customer_info.customer_name}
                    onChange={(e) => handleCustomerInfoChange('customer_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer/company name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Location *</label>
                  <input
                    type="text"
                    value={formData.customer_info.site_location}
                    onChange={(e) => handleCustomerInfoChange('site_location', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter site address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.customer_info.contact_person}
                    onChange={(e) => handleCustomerInfoChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.customer_info.contact_number}
                    onChange={(e) => handleCustomerInfoChange('contact_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.customer_info.email}
                    onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Service Provider Tab */}
          {activeTab === 'provider' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">Service Provider Information</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Enter your company details that will appear in the PDF report.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.service_provider.company_name}
                    onChange={(e) => handleServiceProviderChange('company_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    value={formData.service_provider.address}
                    onChange={(e) => handleServiceProviderChange('address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.service_provider.contact_person}
                    onChange={(e) => handleServiceProviderChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={formData.service_provider.contact_number}
                    onChange={(e) => handleServiceProviderChange('contact_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.service_provider.email}
                    onChange={(e) => handleServiceProviderChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.service_provider.gstin}
                    onChange={(e) => handleServiceProviderChange('gstin', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter GST number"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Equipment List Tab */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Equipment Covered Under AMC</h3>
                <button
                  type="button"
                  onClick={addEquipment}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={18} />
                  Add Equipment
                </button>
              </div>

              {formData.equipment_list.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No equipment added yet</p>
                  <button
                    type="button"
                    onClick={addEquipment}
                    className="mt-3 text-blue-600 hover:underline"
                  >
                    Add your first equipment
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.equipment_list.map((equipment, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
                          Equipment #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEquipment(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Type</label>
                          <select
                            value={equipment.equipment_type}
                            onChange={(e) => updateEquipment(index, 'equipment_type', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select type...</option>
                            {EQUIPMENT_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Name</label>
                          <input
                            type="text"
                            value={equipment.equipment_name}
                            onChange={(e) => updateEquipment(index, 'equipment_name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Main Panel ACB"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={equipment.quantity}
                            onChange={(e) => updateEquipment(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Service Frequency</label>
                          <select
                            value={equipment.service_frequency}
                            onChange={(e) => updateEquipment(index, 'service_frequency', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {SERVICE_FREQUENCIES.map((freq) => (
                              <option key={freq.id} value={freq.id}>{freq.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Last Service Date</label>
                          <DatePicker
                            value={equipment.last_service_date}
                            onChange={(val) => updateEquipment(index, 'last_service_date', val)}
                            placeholder="Select date"
                            className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Next Service Date</label>
                          <DatePicker
                            value={equipment.next_service_date}
                            onChange={(val) => updateEquipment(index, 'next_service_date', val)}
                            placeholder="Select date"
                            className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Service Visits Tab */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Service Visits</h3>
                <button
                  type="button"
                  onClick={addServiceVisit}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={18} />
                  Add Visit
                </button>
              </div>

              {formData.service_visits.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No service visits scheduled</p>
                  <button
                    type="button"
                    onClick={addServiceVisit}
                    className="mt-3 text-blue-600 hover:underline"
                  >
                    Schedule a visit
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.service_visits.map((visit, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                          Visit #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeServiceVisit(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Visit Date</label>
                          <DatePicker
                            value={visit.visit_date}
                            onChange={(val) => updateServiceVisit(index, 'visit_date', val)}
                            placeholder="Select date"
                            className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type</label>
                          <select
                            value={visit.visit_type}
                            onChange={(e) => updateServiceVisit(index, 'visit_type', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="emergency">Emergency</option>
                            <option value="follow-up">Follow-up</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <select
                            value={visit.status}
                            onChange={(e) => updateServiceVisit(index, 'status', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rescheduled">Rescheduled</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Technician</label>
                          <input
                            type="text"
                            value={visit.technician_name}
                            onChange={(e) => updateServiceVisit(index, 'technician_name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Technician name"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                        <textarea
                          value={visit.remarks}
                          onChange={(e) => updateServiceVisit(index, 'remarks', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Visit remarks or notes..."
                        />
                      </div>
                      
                      {/* Test Reports Link Section */}
                      <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-blue-600" />
                            Linked Test Reports ({visit.test_report_ids?.length || 0})
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openLinkModal(index)}
                              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Link size={14} />
                              Link Reports
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/projects/project-reports/equipment');
                              }}
                              className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center gap-1"
                            >
                              <Plus size={14} />
                              Create New
                            </button>
                          </div>
                        </div>
                        
                        {/* Display linked reports */}
                        {visit.test_report_ids && visit.test_report_ids.length > 0 ? (
                          <LinkedReportsDisplay 
                            reportIds={visit.test_report_ids}
                            onUnlink={handleUnlinkReport}
                            visitIndex={index}
                          />
                        ) : (
                          <div className="text-center py-4 bg-slate-50 rounded-lg">
                            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">
                              No test reports linked to this visit yet
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Click &quot;Link Reports&quot; to connect existing test reports
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* IR Thermography Reports Link Section */}
                      <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-rose-600" />
                            Linked IR Thermography Reports ({visit.ir_thermography_report_ids?.length || 0})
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openIRLinkModal(index)}
                              className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center gap-1"
                            >
                              <Link size={14} />
                              Link IR Reports
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/projects/project-reports/audit/ir-thermography/new');
                              }}
                              className="text-xs px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 flex items-center gap-1"
                            >
                              <Plus size={14} />
                              Create New
                            </button>
                          </div>
                        </div>
                        
                        {/* Display linked IR reports */}
                        {visit.ir_thermography_report_ids && visit.ir_thermography_report_ids.length > 0 ? (
                          <LinkedIRReportsDisplay 
                            reportIds={visit.ir_thermography_report_ids}
                            onUnlink={handleUnlinkIRReport}
                            visitIndex={index}
                          />
                        ) : (
                          <div className="text-center py-4 bg-slate-50 rounded-lg">
                            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">
                              No IR thermography reports linked to this visit yet
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Click &quot;Link IR Reports&quot; to connect existing IR thermography reports
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Service Reports Section */}
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-green-700">
                            <FileText size={16} className="text-green-600" />
                            Linked Service Reports ({visit.service_report_ids?.length || 0})
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openServiceLinkModal(index)}
                              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                            >
                              <Link size={14} />
                              Link Service Reports
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/projects/project-reports/equipment');
                              }}
                              className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center gap-1"
                            >
                              <Plus size={14} />
                              Create New
                            </button>
                          </div>
                        </div>
                        
                        {/* Display linked service reports */}
                        {visit.service_report_ids && visit.service_report_ids.length > 0 ? (
                          <LinkedServiceReportsDisplay 
                            reportIds={visit.service_report_ids}
                            onUnlink={handleUnlinkServiceReport}
                            visitIndex={index}
                          />
                        ) : (
                          <div className="text-center py-4 bg-slate-50 rounded-lg">
                            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">
                              No service reports linked to this visit yet
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Click &quot;Link Service Reports&quot; to connect equipment service reports
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Document Details Tab */}
          {activeTab === 'document' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Document Information</h3>
              <p className="text-sm text-slate-500">These details will appear in the PDF report header and document details section.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Revision</label>
                  <input
                    type="text"
                    value={formData.document_details.revision}
                    onChange={(e) => handleDocumentDetailsChange('revision', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prepared By</label>
                  <input
                    type="text"
                    value={formData.document_details.prepared_by}
                    onChange={(e) => handleDocumentDetailsChange('prepared_by', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Name of preparer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Approved By</label>
                  <input
                    type="text"
                    value={formData.document_details.approved_by}
                    onChange={(e) => handleDocumentDetailsChange('approved_by', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Name of approver"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Spare & Consumables Tab */}
          {activeTab === 'spare' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Spare Parts & Consumables Used</h3>
                  <p className="text-sm text-slate-500">Track spare parts and consumables used during service visits</p>
                </div>
                <button
                  type="button"
                  onClick={addSpareConsumable}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  data-testid="add-spare-btn"
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>

              {formData.spare_consumables.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No spare parts or consumables added</p>
                  <p className="text-sm text-slate-400 mt-1">Click &quot;Add Item&quot; to track parts used during service</p>
                  <button
                    type="button"
                    onClick={addSpareConsumable}
                    className="mt-4 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Add spare part or consumable
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.spare_consumables.map((item, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <span className={`px-2 py-1 text-sm font-medium rounded ${
                          item.item_type === 'spare' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {item.item_type === 'spare' ? 'Spare Part' : 'Consumable'} #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSpareConsumable(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => updateSpareConsumable(index, 'item_name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter item name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                          <select
                            value={item.item_type}
                            onChange={(e) => updateSpareConsumable(index, 'item_type', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="spare">Spare Part</option>
                            <option value="consumable">Consumable</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Part Number</label>
                          <input
                            type="text"
                            value={item.part_number}
                            onChange={(e) => updateSpareConsumable(index, 'part_number', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Part/Model number"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateSpareConsumable(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateSpareConsumable(index, 'unit', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="nos">Nos</option>
                              <option value="kg">Kg</option>
                              <option value="ltr">Ltr</option>
                              <option value="mtr">Mtr</option>
                              <option value="set">Set</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Used Date</label>
                          <input
                            type="date"
                            value={item.used_date}
                            onChange={(e) => updateSpareConsumable(index, 'used_date', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateSpareConsumable(index, 'remarks', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Additional notes or remarks"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statutory Documents Tab */}
          {activeTab === 'statutory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Statutory Documents & Attachments</h3>
                  <p className="text-sm text-slate-500">Upload calibration certificates, statutory documents, and other attachments</p>
                </div>
                <button
                  type="button"
                  onClick={addStatutoryDocument}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  data-testid="add-statutory-doc-btn"
                >
                  <Plus size={18} />
                  Add Document
                </button>
              </div>

              {formData.statutory_documents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <Paperclip className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No statutory documents attached</p>
                  <p className="text-sm text-slate-400 mt-1">Upload calibration certificates, compliance documents, etc.</p>
                  <button
                    type="button"
                    onClick={addStatutoryDocument}
                    className="mt-4 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Add document
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.statutory_documents.map((doc, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded flex items-center gap-1">
                          <File size={14} />
                          Document #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeStatutoryDocument(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Remove document"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
                          <select
                            value={doc.document_type}
                            onChange={(e) => updateStatutoryDocument(index, 'document_type', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="calibration_certificate">Calibration Certificate</option>
                            <option value="test_certificate">Test Certificate</option>
                            <option value="compliance_certificate">Compliance Certificate</option>
                            <option value="safety_certificate">Safety Certificate</option>
                            <option value="warranty_document">Warranty Document</option>
                            <option value="manufacturer_datasheet">Manufacturer Datasheet</option>
                            <option value="installation_certificate">Installation Certificate</option>
                            <option value="other">Other Document</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Document Name *</label>
                          <input
                            type="text"
                            value={doc.document_name}
                            onChange={(e) => updateStatutoryDocument(index, 'document_name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Transformer Oil Test Certificate"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Reference No.</label>
                          <input
                            type="text"
                            value={doc.reference_no}
                            onChange={(e) => updateStatutoryDocument(index, 'reference_no', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Certificate/Document number"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                            <input
                              type="date"
                              value={doc.issue_date}
                              onChange={(e) => updateStatutoryDocument(index, 'issue_date', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                            <input
                              type="date"
                              value={doc.expiry_date}
                              onChange={(e) => updateStatutoryDocument(index, 'expiry_date', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Upload Document (PDF)</label>
                          <div className="flex items-center gap-3">
                            {doc.file_url ? (
                              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle size={18} className="text-green-600" />
                                <span className="text-sm text-green-700 truncate flex-1">{doc.file_name || 'Document uploaded'}</span>
                                <a 
                                  href={doc.file_url.startsWith('http') ? doc.file_url : `${API}${doc.file_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                                  title="View document"
                                >
                                  <ExternalLink size={16} />
                                </a>
                              </div>
                            ) : (
                              <div className="flex-1">
                                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                  <Upload size={20} className="text-slate-400" />
                                  <span className="text-sm text-slate-500">Click to upload PDF</span>
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => handleFileUpload(index, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}
                            {doc.file_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateStatutoryDocument(index, 'file_url', '');
                                  updateStatutoryDocument(index, 'file_name', '');
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Remove file"
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Summary */}
              {formData.statutory_documents.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2">Document Summary</h4>
                  <div className="text-sm text-blue-700">
                    <p>Total documents: {formData.statutory_documents.length}</p>
                    <p>Uploaded: {formData.statutory_documents.filter(d => d.file_url).length}</p>
                    <p>Pending upload: {formData.statutory_documents.filter(d => !d.file_url).length}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Link Test Report Modal */}
      <LinkTestReportModal
        isOpen={linkModalOpen}
        onClose={() => {
          setLinkModalOpen(false);
          setSelectedVisitIndex(null);
        }}
        onLink={handleLinkTestReport}
        visitIndex={selectedVisitIndex}
        linkedReportIds={selectedVisitIndex !== null ? (formData.service_visits[selectedVisitIndex]?.test_report_ids || []) : []}
      />
      
      {/* Link IR Thermography Report Modal */}
      <LinkIRThermographyModal
        isOpen={irLinkModalOpen}
        onClose={() => {
          setIRLinkModalOpen(false);
          setSelectedVisitIndex(null);
        }}
        onLink={handleLinkIRReport}
        visitIndex={selectedVisitIndex}
        linkedReportIds={selectedVisitIndex !== null ? (formData.service_visits[selectedVisitIndex]?.ir_thermography_report_ids || []) : []}
      />

      {/* Link Service Report Modal */}
      <LinkServiceReportModal
        isOpen={serviceLinkModalOpen}
        onClose={() => {
          setServiceLinkModalOpen(false);
          setSelectedVisitIndex(null);
        }}
        onLink={handleLinkServiceReport}
        visitIndex={selectedVisitIndex}
        linkedReportIds={selectedVisitIndex !== null ? (formData.service_visits[selectedVisitIndex]?.service_report_ids || []) : []}
      />
    </div>
  );
};

export default AMCForm;
