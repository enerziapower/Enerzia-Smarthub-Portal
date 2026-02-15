import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Building2, Mail, Phone, MapPin, Save, Loader2,
  AlertCircle, CheckCircle2, FolderOpen, FileText, Link2, 
  Trash2, Key, ToggleLeft, ToggleRight, Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerProfile = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const isNew = customerId === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState({
    name: '',
    company_name: '',
    email: '',
    contact_number: '',
    address: '',
    gst_number: '',
    portal_access: true
  });
  const [projects, setProjects] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (!isNew) {
      loadCustomer();
    }
  }, [customerId, isNew]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/customer-hub/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
        setProjects(data.projects || []);
      } else {
        throw new Error('Customer not found');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/customer-hub/customers/${customerId}/available-projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error loading available projects:', err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const url = isNew 
        ? `${API_URL}/api/customer-hub/customers`
        : `${API_URL}/api/customer-hub/customers/${customerId}`;
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(customer)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess('Customer saved successfully');
        if (isNew) {
          navigate(`/customer-hub/${data.id}`);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to save');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/customer-hub/customers/${customerId}/link-projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(selectedProjects)
      });
      
      if (response.ok) {
        setSuccess('Projects linked successfully');
        setShowProjectSelector(false);
        setSelectedProjects([]);
        loadCustomer();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnlinkProject = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/customer-hub/customers/${customerId}/unlink-project/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setSuccess('Project unlinked');
        loadCustomer();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAutoLink = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/customer-hub/customers/${customerId}/auto-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        loadCustomer();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetPassword = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/customer-hub/customers/${customerId}/set-portal-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPassword)
      });
      
      if (response.ok) {
        setSuccess('Portal password set successfully');
        setShowPasswordModal(false);
        setNewPassword('');
        loadCustomer();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTogglePortalAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/customer-hub/customers/${customerId}/toggle-portal-access?enabled=${!customer.portal_access}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setCustomer({ ...customer, portal_access: !customer.portal_access });
        setSuccess(`Portal access ${!customer.portal_access ? 'enabled' : 'disabled'}`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/customer-hub"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {isNew ? 'Add Customer' : customer.name}
          </h1>
          {!isNew && <p className="text-slate-500">{customer.company_name}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      {!isNew && (
        <div className="flex gap-2 border-b border-slate-200">
          {['details', 'projects', 'portal'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'text-slate-900 border-slate-900' 
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab === 'details' && 'Details'}
              {tab === 'projects' && 'Linked Projects'}
              {tab === 'portal' && 'Portal Access'}
            </button>
          ))}
        </div>
      )}

      {/* Details Tab */}
      {(isNew || activeTab === 'details') && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={customer.company_name}
                onChange={(e) => setCustomer({ ...customer, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={customer.contact_number || ''}
                  onChange={(e) => setCustomer({ ...customer, contact_number: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
              <input
                type="text"
                value={customer.gst_number || ''}
                onChange={(e) => setCustomer({ ...customer, gst_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea
                  value={customer.address || ''}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  rows={2}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {!isNew && activeTab === 'projects' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Linked Projects</h2>
            <div className="flex gap-2">
              <button
                onClick={handleAutoLink}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Zap className="w-4 h-4" />
                Auto-Link by Company
              </button>
              <button
                onClick={() => {
                  loadAvailableProjects();
                  setShowProjectSelector(true);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                <Link2 className="w-4 h-4" />
                Link Project
              </button>
            </div>
          </div>

          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project) => (
                <div 
                  key={project.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{project.project_name}</p>
                      <p className="text-sm text-slate-500">
                        {project.pid_no} • {project.client} • {project.status}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlinkProject(project.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Unlink project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No projects linked yet</p>
              <p className="text-sm">Link projects to give this customer portal access</p>
            </div>
          )}
        </div>
      )}

      {/* Portal Access Tab */}
      {!isNew && activeTab === 'portal' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Portal Access Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Portal Access</p>
                <p className="text-sm text-slate-500">Allow customer to login to the portal</p>
              </div>
              <button
                onClick={handleTogglePortalAccess}
                className={`p-2 rounded-lg ${customer.portal_access ? 'text-green-600' : 'text-slate-400'}`}
              >
                {customer.portal_access ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Portal Password</p>
                <p className="text-sm text-slate-500">
                  {customer.password_hash ? 'Password is set' : 'No password set yet'}
                </p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-white"
              >
                <Key className="w-4 h-4" />
                {customer.password_hash ? 'Reset Password' : 'Set Password'}
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Portal URL:</strong> /customer-portal/login
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Login Email:</strong> {customer.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Link Projects</h3>
              <button onClick={() => setShowProjectSelector(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availableProjects.length > 0 ? (
                <div className="space-y-2">
                  {availableProjects.map((project) => (
                    <label 
                      key={project.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProjects([...selectedProjects, project.id]);
                          } else {
                            setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{project.project_name}</p>
                        <p className="text-sm text-slate-500">{project.pid_no} • {project.client}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No available projects to link</p>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowProjectSelector(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button 
                onClick={handleLinkProjects}
                disabled={selectedProjects.length === 0}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                Link {selectedProjects.length} Project(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Set Portal Password</h3>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button 
                onClick={handleSetPassword}
                disabled={!newPassword}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                Set Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
