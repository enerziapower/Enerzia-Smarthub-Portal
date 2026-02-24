import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Download, Eye, Trash2, Edit2, X, Save, Loader2,
  Calendar, GanttChart, FileText, Building2, Clock, CheckCircle,
  ChevronLeft, ChevronRight, AlertTriangle, ChevronDown, ChevronUp,
  MapPin, Package, User, Phone, Mail
} from 'lucide-react';
import { projectsAPI } from '../../services/api';
import { DatePicker } from '../../components/ui/date-picker';
import { toast } from 'sonner';
import api from '../../services/api';

const ProjectSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);

  const defaultPhases = [
    { name: 'Planning & Design', start: '', end: '', progress: 0, color: 'bg-blue-500', subItems: [] },
    { name: 'Material Procurement', start: '', end: '', progress: 0, color: 'bg-amber-500', subItems: [] },
    { name: 'Installation', start: '', end: '', progress: 0, color: 'bg-green-500', subItems: [] },
    { name: 'Testing & Commissioning', start: '', end: '', progress: 0, color: 'bg-purple-500', subItems: [] },
    { name: 'Documentation', start: '', end: '', progress: 0, color: 'bg-slate-500', subItems: [] }
  ];

  const defaultEscalationMatrix = [
    { level: 1, name: '', designation: '', email: '', mobile: '' },
    { level: 2, name: '', designation: '', email: '', mobile: '' },
    { level: 3, name: '', designation: '', email: '', mobile: '' },
    { level: 4, name: '', designation: '', email: '', mobile: '' }
  ];

  const [formData, setFormData] = useState({
    project_id: '',
    schedule_name: '',
    start_date: '',
    end_date: '',
    customer_info: {
      name: '',
      company: '',
      location: '',
      contact_person: '',
      phone: '',
      email: ''
    },
    phases: defaultPhases,
    milestones: [],
    escalation_matrix: defaultEscalationMatrix,
    notes: '',
    status: 'draft'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, schedulesRes] = await Promise.all([
        projectsAPI.getAll(),
        api.get('/project-schedules')
      ]);
      setProjects(projectsRes.data || []);
      setSchedules(schedulesRes.data || []);
      
      // Migrate any existing localStorage schedules to database
      const savedSchedules = localStorage.getItem('project_schedules');
      if (savedSchedules) {
        const localSchedules = JSON.parse(savedSchedules);
        if (localSchedules.length > 0) {
          try {
            await api.post('/project-schedules/migrate-from-localstorage', localSchedules);
            localStorage.removeItem('project_schedules');
            // Reload schedules after migration
            const refreshRes = await api.get('/project-schedules');
            setSchedules(refreshRes.data || []);
            toast.success('Migrated local schedules to database');
          } catch (migrationError) {
            console.error('Migration error:', migrationError);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (e) => {
    const projectId = e.target.value;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setFormData(prev => ({
        ...prev,
        project_id: projectId,
        schedule_name: `${project.pid_no} - ${project.project_name}`,
        start_date: project.project_date || '',
        end_date: project.completion_date || '',
        customer_info: {
          name: project.client || '',
          company: project.client || '',
          location: project.location || '',
          contact_person: project.engineer_in_charge || '',
          phone: '',
          email: ''
        }
      }));
    }
  };

  const addPhase = () => {
    const colors = ['bg-blue-500', 'bg-amber-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];
    setFormData(prev => ({
      ...prev,
      phases: [...prev.phases, { 
        name: '', 
        start: '', 
        end: '', 
        progress: 0, 
        color: colors[prev.phases.length % colors.length],
        subItems: []
      }]
    }));
  };

  const updatePhase = (index, field, value) => {
    const updated = [...formData.phases];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, phases: updated }));
  };

  const removePhase = (index) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== index)
    }));
  };

  // Sub-item management for phases
  const addSubItem = (phaseIndex) => {
    const updated = [...formData.phases];
    if (!updated[phaseIndex].subItems) {
      updated[phaseIndex].subItems = [];
    }
    // Default sub-item dates to parent phase dates
    const phase = updated[phaseIndex];
    updated[phaseIndex].subItems.push({
      description: '',
      qty: '',
      unit: '',
      start_date: phase.start || '',
      end_date: phase.end || ''
    });
    setFormData(prev => ({ ...prev, phases: updated }));
  };

  const updateSubItem = (phaseIndex, subIndex, field, value) => {
    const updated = [...formData.phases];
    updated[phaseIndex].subItems[subIndex][field] = value;
    setFormData(prev => ({ ...prev, phases: updated }));
  };

  const removeSubItem = (phaseIndex, subIndex) => {
    const updated = [...formData.phases];
    updated[phaseIndex].subItems = updated[phaseIndex].subItems.filter((_, i) => i !== subIndex);
    setFormData(prev => ({ ...prev, phases: updated }));
  };

  const moveSubItemUp = (phaseIndex, subIndex) => {
    if (subIndex === 0) return; // Already at top
    const updated = [...formData.phases];
    const subItems = [...updated[phaseIndex].subItems];
    // Swap with previous item
    [subItems[subIndex - 1], subItems[subIndex]] = [subItems[subIndex], subItems[subIndex - 1]];
    updated[phaseIndex].subItems = subItems;
    setFormData(prev => ({ ...prev, phases: updated }));
  };

  const moveSubItemDown = (phaseIndex, subIndex) => {
    const updated = [...formData.phases];
    if (subIndex >= updated[phaseIndex].subItems.length - 1) return; // Already at bottom
    const subItems = [...updated[phaseIndex].subItems];
    // Swap with next item
    [subItems[subIndex], subItems[subIndex + 1]] = [subItems[subIndex + 1], subItems[subIndex]];
    updated[phaseIndex].subItems = subItems;
    setFormData(prev => ({ ...prev, phases: updated }));
  };

  const togglePhaseExpand = (phaseIndex) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseIndex]: !prev[phaseIndex]
    }));
  };

  const updateEscalationLevel = (index, field, value) => {
    const updated = [...formData.escalation_matrix];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, escalation_matrix: updated }));
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { name: '', date: '', completed: false }]
    }));
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...formData.milestones];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, milestones: updated }));
  };

  const removeMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    try {
      if (editingScheduleId) {
        // Update existing schedule
        const updateData = {
          ...formData,
          updated_at: new Date().toISOString()
        };
        const response = await api.put(`/project-schedules/${editingScheduleId}`, updateData);
        const updatedSchedule = {
          ...response.data,
          project: projects.find(p => p.id === formData.project_id)
        };
        setSchedules(prev => prev.map(s => s.id === editingScheduleId ? updatedSchedule : s));
        toast.success('Schedule updated successfully!');
      } else {
        // Create new schedule
        const newScheduleData = {
          ...formData,
          created_at: new Date().toISOString()
        };
        const response = await api.post('/project-schedules', newScheduleData);
        const newSchedule = {
          ...response.data,
          project: projects.find(p => p.id === formData.project_id)
        };
        setSchedules(prev => [...prev, newSchedule]);
        toast.success('Schedule created successfully!');
      }
      
      setShowCreateModal(false);
      setEditingScheduleId(null);
      resetForm();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  const handleEdit = (schedule) => {
    setEditingScheduleId(schedule.id);
    
    // Find matching project - check both by id and by pid_no (with various formats)
    let matchedProjectId = schedule.project_id || '';
    let project = projects.find(p => p.id === schedule.project_id);
    
    // If not found by id, try to find by pid_no
    if (!project) {
      project = projects.find(p => p.pid_no === schedule.project_id);
    }
    
    // Try normalized PID matching (remove leading zeros, compare)
    if (!project && schedule.project_id) {
      const normalizedStoredPid = schedule.project_id.replace(/(\d+)$/, (m) => parseInt(m, 10).toString());
      project = projects.find(p => {
        const normalizedPid = p.pid_no?.replace(/(\d+)$/, (m) => parseInt(m, 10).toString());
        return normalizedPid === normalizedStoredPid;
      });
    }
    
    if (project) {
      matchedProjectId = project.id;
    }
    
    // Ensure escalation matrix has valid data
    let escalationMatrix = schedule.escalation_matrix;
    if (!escalationMatrix || !Array.isArray(escalationMatrix) || escalationMatrix.length === 0) {
      escalationMatrix = defaultEscalationMatrix;
    }
    
    setFormData({
      project_id: matchedProjectId,
      schedule_name: schedule.schedule_name || '',
      start_date: schedule.start_date || '',
      end_date: schedule.end_date || '',
      customer_info: schedule.customer_info || {
        name: project?.client || '',
        company: project?.client || '',
        location: project?.location || '',
        contact_person: project?.engineer_in_charge || '',
        phone: '',
        email: ''
      },
      phases: schedule.phases?.map(p => ({
        ...p,
        subItems: p.subItems || []
      })) || defaultPhases,
      milestones: schedule.milestones || [],
      escalation_matrix: escalationMatrix,
      notes: schedule.notes || '',
      status: schedule.status || 'draft'
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.delete(`/project-schedules/${id}`);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule deleted successfully!');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      schedule_name: '',
      start_date: '',
      end_date: '',
      customer_info: {
        name: '',
        company: '',
        location: '',
        contact_person: '',
        phone: '',
        email: ''
      },
      phases: defaultPhases.map(p => ({ ...p, subItems: [] })),
      milestones: [],
      escalation_matrix: defaultEscalationMatrix,
      notes: '',
      status: 'draft'
    });
    setEditingScheduleId(null);
    setExpandedPhases({});
  };

  const exportToPDF = async (schedule) => {
    try {
      toast.info('Generating PDF report...');
      
      // Call the backend endpoint to generate professional PDF
      const response = await api.post('/project-schedule/pdf', schedule, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Project_Schedule_${schedule.id}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=([^;]+)/);
        if (match) {
          filename = match[1].replace(/"/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      // If already in DD-MM-YYYY format, return as is
      if (dateStr.includes('-') && dateStr.length === 10) {
        const parts = dateStr.split('-');
        if (parts[0].length === 2 && parts[2].length === 4) {
          return dateStr; // Already DD-MM-YYYY
        }
        // YYYY-MM-DD format, convert to DD-MM-YYYY
        if (parts[0].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      // DD/MM/YYYY format, convert to DD-MM-YYYY
      if (dateStr.includes('/')) {
        return dateStr.replace(/\//g, '-');
      }
      // Parse and format
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const filteredSchedules = schedules.filter(s =>
    s.schedule_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.project?.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer_info?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Simple Gantt Chart Component
  const GanttChartView = ({ schedule }) => {
    if (!schedule.start_date || !schedule.end_date) return null;

    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };

    const projectStart = parseDate(schedule.start_date);
    const projectEnd = parseDate(schedule.end_date);
    
    if (!projectStart || !projectEnd) return null;

    const totalDays = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24));
    const months = [];
    let currentDate = new Date(projectStart);
    
    while (currentDate <= projectEnd) {
      const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months.includes(monthYear)) {
        months.push(monthYear);
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const getBarStyle = (startDateStr, endDateStr) => {
      const itemStart = parseDate(startDateStr);
      const itemEnd = parseDate(endDateStr);
      
      if (!itemStart || !itemEnd) return { left: '0%', width: '0%' };

      const startOffset = Math.max(0, (itemStart - projectStart) / (projectEnd - projectStart) * 100);
      const duration = Math.min(100 - startOffset, (itemEnd - itemStart) / (projectEnd - projectStart) * 100);

      return {
        left: `${startOffset}%`,
        width: `${Math.max(duration, 2)}%`
      };
    };

    // Sub-item colors (lighter versions of phase colors)
    const subItemColors = {
      'bg-blue-500': 'bg-blue-300',
      'bg-amber-500': 'bg-amber-300',
      'bg-green-500': 'bg-green-300',
      'bg-purple-500': 'bg-purple-300',
      'bg-slate-500': 'bg-slate-300',
      'bg-pink-500': 'bg-pink-300',
      'bg-cyan-500': 'bg-cyan-300',
    };

    return (
      <div className="bg-slate-50 rounded-lg p-4 overflow-x-auto">
        {/* Month Headers */}
        <div className="flex border-b border-slate-200 mb-4 min-w-[800px]">
          <div className="w-56 shrink-0 font-medium text-slate-600 text-sm py-2">Phase / Sub-Item</div>
          <div className="flex-1 flex">
            {months.map((month, idx) => (
              <div key={idx} className="flex-1 text-center text-xs text-slate-500 py-2 border-l border-slate-200">
                {month}
              </div>
            ))}
          </div>
        </div>

        {/* Phases and Sub-Items */}
        {schedule.phases.map((phase, phaseIdx) => {
          const phaseBarStyle = getBarStyle(phase.start, phase.end);
          return (
            <div key={phaseIdx} className="mb-1">
              {/* Phase Row */}
              <div className="flex items-center mb-1 min-w-[800px]">
                <div className="w-56 shrink-0 pr-4">
                  <span className="text-sm font-semibold text-slate-800">{phase.name}</span>
                  <div className="text-xs text-slate-500">
                    {phase.start && phase.end ? `${formatDate(phase.start)} - ${formatDate(phase.end)}` : ''}
                    {phase.progress > 0 && <span className="ml-2">({phase.progress}%)</span>}
                  </div>
                </div>
                <div className="flex-1 relative h-7 bg-slate-200 rounded">
                  <div
                    className={`absolute top-0 h-full ${phase.color} rounded transition-all opacity-90`}
                    style={phaseBarStyle}
                  >
                    {phase.progress > 0 && (
                      <div
                        className="h-full bg-white/30 rounded-r"
                        style={{ width: `${100 - phase.progress}%`, marginLeft: 'auto' }}
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Sub-Items Rows */}
              {phase.subItems && phase.subItems.length > 0 && phase.subItems.map((subItem, subIdx) => {
                const subBarStyle = getBarStyle(subItem.start_date, subItem.end_date);
                const subColor = subItemColors[phase.color] || 'bg-slate-300';
                return (
                  <div key={subIdx} className="flex items-center mb-1 min-w-[800px]">
                    <div className="w-56 shrink-0 pr-4 pl-4">
                      <span className="text-xs text-slate-600">{subItem.description || `Sub-item ${subIdx + 1}`}</span>
                      {subItem.qty && <span className="text-xs text-slate-400 ml-1">({subItem.qty} {subItem.unit})</span>}
                      <div className="text-xs text-slate-400">
                        {subItem.start_date && subItem.end_date ? `${formatDate(subItem.start_date)} - ${formatDate(subItem.end_date)}` : ''}
                      </div>
                    </div>
                    <div className="flex-1 relative h-5 bg-slate-100 rounded">
                      {subItem.start_date && subItem.end_date && (
                        <div
                          className={`absolute top-0 h-full ${subColor} rounded transition-all`}
                          style={subBarStyle}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Milestones */}
        {schedule.milestones && schedule.milestones.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-2">Milestones</div>
            <div className="flex flex-wrap gap-2">
              {schedule.milestones.map((milestone, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                    milestone.completed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {milestone.completed ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {milestone.name} ({formatDate(milestone.date)})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-slate-800">Project Schedule</h1>
            <p className="text-slate-500 mt-1">Create and manage project schedules with phase timelines</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          data-testid="create-schedule"
        >
          <Plus size={18} />
          Create Schedule
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search schedules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-lg">
              <GanttChart size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Schedules</p>
              <p className="text-2xl font-bold text-slate-900">{schedules.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Draft</p>
              <p className="text-2xl font-bold text-amber-600">{schedules.filter(s => s.status === 'draft').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <AlertTriangle size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{schedules.filter(s => s.status === 'in_progress').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{schedules.filter(s => s.status === 'completed').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <GanttChart size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Schedules Found</h3>
          <p className="text-slate-500 mb-4">Create your first project schedule</p>
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map(schedule => (
            <div key={schedule.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Schedule Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg mt-1">
                      <GanttChart size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">{schedule.schedule_name}</h3>
                      <p className="text-sm text-slate-500">
                        {formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}
                      </p>
                      
                      {/* Customer Details */}
                      {(schedule.customer_info?.name || schedule.customer_info?.company || schedule.project?.client) && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                            <Building2 size={14} className="text-indigo-500" />
                            {schedule.customer_info?.name || schedule.customer_info?.company || schedule.project?.client}
                          </p>
                          {schedule.customer_info?.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 ml-5">
                              <MapPin size={12} />
                              {schedule.customer_info.location}
                            </p>
                          )}
                          {schedule.customer_info?.contact_person && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 ml-5">
                              <User size={12} />
                              {schedule.customer_info.contact_person}
                              {schedule.customer_info?.phone && ` • ${schedule.customer_info.phone}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      schedule.status === 'completed' ? 'bg-green-100 text-green-700' :
                      schedule.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {schedule.status === 'in_progress' ? 'In Progress' : 
                       schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                    </span>
                    <button
                      onClick={() => { setSelectedSchedule(schedule); setShowViewModal(true); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Edit"
                      data-testid={`edit-schedule-${schedule.id}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => exportToPDF(schedule)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingScheduleId ? 'Edit Project Schedule' : 'Create Project Schedule'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Project *</label>
                <select
                  value={formData.project_id}
                  onChange={handleProjectSelect}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select a project...</option>
                  {/* Show current value as option if it doesn't match any project */}
                  {formData.project_id && !projects.find(p => p.id === formData.project_id) && (
                    <option value={formData.project_id} disabled>
                      {formData.project_id} (not found in projects list)
                    </option>
                  )}
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.pid_no} - {p.client} - {p.project_name}</option>
                  ))}
                </select>
              </div>

              {/* Schedule Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={formData.schedule_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Customer Information Section */}
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                  <Building2 size={18} />
                  Customer Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={formData.customer_info.name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        customer_info: { ...prev.customer_info, name: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.customer_info.company}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        customer_info: { ...prev.customer_info, company: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.customer_info.location}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        customer_info: { ...prev.customer_info, location: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Site location"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.customer_info.contact_person}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        customer_info: { ...prev.customer_info, contact_person: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.customer_info.phone}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        customer_info: { ...prev.customer_info, phone: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.customer_info.email}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        customer_info: { ...prev.customer_info, email: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Email address"
                    />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <DatePicker
                    value={formData.start_date}
                    onChange={(val) => setFormData(prev => ({ ...prev, start_date: val }))}
                    placeholder="Select date"
                    className="h-10 border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <DatePicker
                    value={formData.end_date}
                    onChange={(val) => setFormData(prev => ({ ...prev, end_date: val }))}
                    placeholder="Select date"
                    className="h-10 border-slate-200"
                  />
                </div>
              </div>

              {/* Phases with Sub-Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Phases & Sub-Items</label>
                  <button
                    type="button"
                    onClick={addPhase}
                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                  >
                    + Add Phase
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.phases.map((phase, phaseIdx) => (
                    <div key={phaseIdx} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Phase Header */}
                      <div className="flex gap-2 items-center p-3 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => togglePhaseExpand(phaseIdx)}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          {expandedPhases[phaseIdx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <input
                          type="text"
                          placeholder="Phase name"
                          value={phase.name}
                          onChange={(e) => updatePhase(phaseIdx, 'name', e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                        />
                        <DatePicker
                          value={phase.start}
                          onChange={(val) => updatePhase(phaseIdx, 'start', val)}
                          placeholder="Start"
                          className="w-28 h-8 border-slate-200 text-sm"
                        />
                        <DatePicker
                          value={phase.end}
                          onChange={(val) => updatePhase(phaseIdx, 'end', val)}
                          placeholder="End"
                          className="w-28 h-8 border-slate-200 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="%"
                          min="0"
                          max="100"
                          value={phase.progress}
                          onChange={(e) => updatePhase(phaseIdx, 'progress', parseInt(e.target.value) || 0)}
                          className="w-14 px-2 py-1.5 border border-slate-200 rounded text-sm"
                        />
                        <span className="text-xs text-slate-500">
                          {phase.subItems?.length || 0} items
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhase(phaseIdx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      {/* Sub-Items Section */}
                      {expandedPhases[phaseIdx] && (
                        <div className="p-3 border-t border-slate-200 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-600">Sub-Items / Details</span>
                            <button
                              type="button"
                              onClick={() => addSubItem(phaseIdx)}
                              className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                            >
                              + Add Item
                            </button>
                          </div>
                          
                          {phase.subItems && phase.subItems.length > 0 ? (
                            <div className="space-y-2">
                              {phase.subItems.map((item, subIdx) => (
                                <div key={subIdx} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded">
                                  <div className="col-span-3">
                                    <input
                                      type="text"
                                      placeholder="Description (e.g., 4C x 35mm Cable)"
                                      value={item.description}
                                      onChange={(e) => updateSubItem(phaseIdx, subIdx, 'description', e.target.value)}
                                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <input
                                      type="text"
                                      placeholder="Qty"
                                      value={item.qty || item.quantity}
                                      onChange={(e) => updateSubItem(phaseIdx, subIdx, 'qty', e.target.value)}
                                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <input
                                      type="text"
                                      placeholder="Unit"
                                      value={item.unit}
                                      onChange={(e) => updateSubItem(phaseIdx, subIdx, 'unit', e.target.value)}
                                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <div className="flex items-center gap-1">
                                      <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                                      <input
                                        type="date"
                                        placeholder="Start Date"
                                        value={item.start_date || ''}
                                        onChange={(e) => updateSubItem(phaseIdx, subIdx, 'start_date', e.target.value)}
                                        className="w-full px-1 py-1 border border-slate-200 rounded text-xs"
                                      />
                                    </div>
                                  </div>
                                  <div className="col-span-3">
                                    <div className="flex items-center gap-1">
                                      <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                                      <input
                                        type="date"
                                        placeholder="End Date"
                                        value={item.end_date || ''}
                                        onChange={(e) => updateSubItem(phaseIdx, subIdx, 'end_date', e.target.value)}
                                        className="w-full px-1 py-1 border border-slate-200 rounded text-xs"
                                      />
                                    </div>
                                  </div>
                                  <div className="col-span-1 flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveSubItemUp(phaseIdx, subIdx)}
                                      disabled={subIdx === 0}
                                      className={`p-1 rounded ${subIdx === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200'}`}
                                      title="Move Up"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveSubItemDown(phaseIdx, subIdx)}
                                      disabled={subIdx === phase.subItems.length - 1}
                                      className={`p-1 rounded ${subIdx === phase.subItems.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200'}`}
                                      title="Move Down"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeSubItem(phaseIdx, subIdx)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                      title="Remove"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-2">
                              No sub-items added. Click "+ Add Item" to add tasks with dates.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Milestones</label>
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                  >
                    + Add Milestone
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.milestones.map((milestone, idx) => (
                    <div key={idx} className="flex gap-2 items-center p-2 bg-slate-50 rounded-lg">
                      <input
                        type="text"
                        placeholder="Milestone name"
                        value={milestone.name}
                        onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                      />
                      <DatePicker
                        value={milestone.date}
                        onChange={(val) => updateMilestone(idx, 'date', val)}
                        placeholder="Date"
                        className="w-36 h-8 border-slate-200 text-sm"
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={milestone.completed}
                          onChange={(e) => updateMilestone(idx, 'completed', e.target.checked)}
                        />
                        Done
                      </label>
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Escalation Matrix */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={16} className="text-red-500" />
                  <label className="text-sm font-medium text-slate-700">Project Escalation Matrix</label>
                </div>
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                  {formData.escalation_matrix.map((level, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          idx === 0 ? 'bg-blue-100 text-blue-700' :
                          idx === 1 ? 'bg-amber-100 text-amber-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Level {level.level}
                        </span>
                        <span className="text-xs text-slate-500">
                          {idx === 0 ? '(First Contact)' : idx === 3 ? '(Final Escalation)' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={level.name}
                          onChange={(e) => updateEscalationLevel(idx, 'name', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Designation"
                          value={level.designation}
                          onChange={(e) => updateEscalationLevel(idx, 'designation', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={level.email}
                          onChange={(e) => updateEscalationLevel(idx, 'email', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded"
                        />
                        <input
                          type="text"
                          placeholder="Mobile"
                          value={level.mobile}
                          onChange={(e) => updateEscalationLevel(idx, 'mobile', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.project_id || !formData.schedule_name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {editingScheduleId ? 'Update Schedule' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{selectedSchedule.schedule_name}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(selectedSchedule)}
                  className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-100 flex items-center gap-1"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => exportToPDF(selectedSchedule)}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Download size={14} />
                  Download PDF
                </button>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Customer Info */}
              {(selectedSchedule.customer_info?.name || selectedSchedule.project?.client) && (
                <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                    <Building2 size={16} />
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Customer</span>
                      <p className="font-medium text-slate-800">
                        {selectedSchedule.customer_info?.name || selectedSchedule.project?.client || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location</span>
                      <p className="font-medium text-slate-800">
                        {selectedSchedule.customer_info?.location || selectedSchedule.project?.location || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Contact</span>
                      <p className="font-medium text-slate-800">
                        {selectedSchedule.customer_info?.contact_person || '-'}
                      </p>
                    </div>
                    {selectedSchedule.customer_info?.phone && (
                      <div>
                        <span className="text-slate-500">Phone</span>
                        <p className="font-medium text-slate-800">{selectedSchedule.customer_info.phone}</p>
                      </div>
                    )}
                    {selectedSchedule.customer_info?.email && (
                      <div>
                        <span className="text-slate-500">Email</span>
                        <p className="font-medium text-slate-800">{selectedSchedule.customer_info.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Project Info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Project</span>
                    <p className="font-medium text-slate-800">{selectedSchedule.project?.pid_no || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Duration</span>
                    <p className="font-medium text-slate-800">
                      {formatDate(selectedSchedule.start_date)} - {formatDate(selectedSchedule.end_date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Status</span>
                    <p className="font-medium text-slate-800 capitalize">{selectedSchedule.status?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Phases</span>
                    <p className="font-medium text-slate-800">{selectedSchedule.phases?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Phases with Sub-Items */}
              {selectedSchedule.phases?.some(p => p.subItems?.length > 0) && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Phase Details</h4>
                  <div className="space-y-3">
                    {selectedSchedule.phases.filter(p => p.subItems?.length > 0).map((phase, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200">
                        <h5 className="font-medium text-slate-800 mb-2">
                          {phase.name}
                          <span className="ml-2 text-xs text-slate-500 font-normal">
                            ({phase.start} to {phase.end})
                          </span>
                        </h5>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="px-2 py-1 text-left">Description</th>
                              <th className="px-2 py-1 text-left">Qty</th>
                              <th className="px-2 py-1 text-left">Unit</th>
                              <th className="px-2 py-1 text-left">Start Date</th>
                              <th className="px-2 py-1 text-left">End Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {phase.subItems.map((item, itemIdx) => (
                              <tr key={itemIdx} className="border-t border-slate-100">
                                <td className="px-2 py-1">{item.description || '-'}</td>
                                <td className="px-2 py-1">{item.qty || item.quantity || '-'}</td>
                                <td className="px-2 py-1">{item.unit || '-'}</td>
                                <td className="px-2 py-1">{item.start_date || '-'}</td>
                                <td className="px-2 py-1">{item.end_date || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedSchedule.notes && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Notes</h4>
                  <p className="text-sm text-slate-600">{selectedSchedule.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSchedule;
