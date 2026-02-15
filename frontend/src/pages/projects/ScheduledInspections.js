import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, Filter, Calendar, Clock, User, MapPin,
  CheckCircle, AlertCircle, AlertTriangle, Bell, Play, Pause, Trash2,
  ChevronRight, RefreshCw, CalendarClock, Repeat, Eye, Edit
} from 'lucide-react';
import { scheduledInspectionsAPI, projectsAPI } from '../../services/api';
import { EQUIPMENT_TYPES } from './EquipmentTestReports';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '../../components/ui/date-picker';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const INSPECTION_TYPES = [
  { value: 'equipment', label: 'Equipment Test', color: 'bg-amber-500' },
  { value: 'amc', label: 'AMC Visit', color: 'bg-blue-500' },
  { value: 'audit', label: 'Audit', color: 'bg-green-500' },
  { value: 'other', label: 'Other', color: 'bg-purple-500' },
];

const ScheduledInspections = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchData();
  }, [filterType, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'all') params.inspection_type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;

      const [inspRes, dashRes, projRes] = await Promise.all([
        scheduledInspectionsAPI.getAll(params),
        scheduledInspectionsAPI.getDashboard(),
        projectsAPI.getAll()
      ]);

      // Handle different response structures
      const inspData = inspRes.data?.inspections || inspRes.data || [];
      const projData = projRes.data?.projects || projRes.data || [];
      
      setInspections(inspData);
      setDashboard(dashRes.data);
      setProjects(projData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (inspection) => {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = inspection.next_due_date;
    
    if (inspection.status === 'paused') {
      return { label: 'Paused', color: 'bg-slate-100 text-slate-600', icon: Pause };
    }
    if (dueDate < today) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    }
    if (dueDate === today) {
      return { label: 'Due Today', color: 'bg-amber-100 text-amber-700', icon: AlertCircle };
    }
    return { label: 'Scheduled', color: 'bg-green-100 text-green-700', icon: CheckCircle };
  };

  const getFrequencyLabel = (freq) => {
    const option = FREQUENCY_OPTIONS.find(f => f.value === freq);
    return option?.label || freq;
  };

  const getTypeInfo = (type) => {
    return INSPECTION_TYPES.find(t => t.value === type) || INSPECTION_TYPES[3];
  };

  const handleComplete = async (inspection) => {
    if (!window.confirm(`Mark "${inspection.title}" as completed?`)) return;
    
    try {
      const response = await scheduledInspectionsAPI.complete(inspection.id, {
        completed_date: new Date().toISOString().split('T')[0]
      });
      alert(`Inspection completed! Next due: ${response.data.next_due_date}`);
      fetchData();
    } catch (error) {
      console.error('Error completing inspection:', error);
      alert('Failed to complete inspection');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scheduled inspection?')) return;
    
    try {
      await scheduledInspectionsAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting inspection:', error);
      alert('Failed to delete inspection');
    }
  };

  const filteredInspections = inspections.filter(i => 
    i.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/projects/project-reports"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">AMC & Service Calendar</h1>
            <p className="text-slate-500 mt-1">Manage AMC visits and periodic service schedules</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          data-testid="create-schedule-btn"
        >
          <Plus size={18} />
          Schedule New
        </button>
      </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <CalendarClock size={16} />
              <span className="text-sm">Total Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{dashboard.total_active || 0}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle size={16} />
              <span className="text-sm">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{dashboard.overdue || 0}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <AlertCircle size={16} />
              <span className="text-sm">Due Today</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{dashboard.due_today || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Calendar size={16} />
              <span className="text-sm">This Week</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{dashboard.this_week || 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Clock size={16} />
              <span className="text-sm">This Month</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{dashboard.this_month || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, location, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {INSPECTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
            <button
              onClick={fetchData}
              className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw size={18} className="text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspections List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500">Loading inspections...</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-blue-50 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CalendarClock size={32} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Scheduled Inspections</h3>
            <p className="text-slate-500 mb-6">
              {searchTerm ? 'No inspections match your search' : 'Start by scheduling your first periodic inspection'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Schedule Inspection
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInspections.map((inspection) => {
              const statusInfo = getStatusInfo(inspection);
              const typeInfo = getTypeInfo(inspection.inspection_type);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={inspection.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Type Badge */}
                    <div className={`${typeInfo.color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <CalendarClock className="text-white" size={24} />
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">{inspection.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {inspection.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat size={14} />
                          {getFrequencyLabel(inspection.frequency)}
                        </span>
                        {inspection.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {inspection.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Due Date */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-slate-500">Next Due</p>
                      <p className={`font-semibold ${statusInfo.label === 'Overdue' ? 'text-red-600' : statusInfo.label === 'Due Today' ? 'text-amber-600' : 'text-slate-800'}`}>
                        {new Date(inspection.next_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleComplete(inspection)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        title="Mark as completed"
                      >
                        <CheckCircle size={14} />
                        Complete
                      </button>
                      <button
                        onClick={() => handleDelete(inspection.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateInspectionModal 
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => { setShowCreateModal(false); fetchData(); }}
          projects={projects}
          user={user}
        />
      )}
    </div>
  );
};

// Create Inspection Modal Component
const CreateInspectionModal = ({ onClose, onCreated, projects, user }) => {
  const [formData, setFormData] = useState({
    title: '',
    inspection_type: 'equipment',
    equipment_type: '',
    project_id: '',
    project_name: '',
    customer_name: '',
    location: '',
    frequency: 'monthly',
    assigned_to: user?.name || '',
    start_date: new Date().toISOString().split('T')[0],
    reminder_days: 3,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'project_id' && value) {
      const project = projects.find(p => p.id === value);
      if (project) {
        setFormData(prev => ({
          ...prev,
          project_name: project.project_name,
          customer_name: project.customer_name || '',
          location: project.location || ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.location) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await scheduledInspectionsAPI.create(formData);
      onCreated();
    } catch (error) {
      console.error('Error creating inspection:', error);
      alert('Failed to create inspection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Schedule New AMC/Service Visit</h2>
          <p className="text-slate-500 text-sm mt-1">Set up a periodic service schedule with reminders</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Monthly Transformer Inspection - Site A"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Type *</label>
              <select
                name="inspection_type"
                value={formData.inspection_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {INSPECTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {formData.inspection_type === 'equipment' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Type</label>
                <select
                  name="equipment_type"
                  value={formData.equipment_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Equipment</option>
                  {EQUIPMENT_TYPES.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project (Optional)</label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.pid_no} - {p.project_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location / Site *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Chennai Plant - Building A"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency *</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {FREQUENCY_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <DatePicker
                value={formData.start_date}
                onChange={(val) => handleChange({ target: { name: 'start_date', value: val } })}
                placeholder="Select date"
                className="h-10 border-slate-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
              <input
                type="text"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reminder (days before)</label>
              <select
                name="reminder_days"
                value={formData.reminder_days}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={3}>3 days before</option>
                <option value={5}>5 days before</option>
                <option value={7}>1 week before</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Additional notes or instructions..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <CalendarClock size={18} />
              {saving ? 'Scheduling...' : 'Schedule Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduledInspections;
