import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Users, Target, TrendingUp, CheckCircle2, Clock, 
  Plus, Edit2, Trash2, Save, X, FileText, Building2, 
  ChevronDown, ChevronUp, AlertCircle, Briefcase, Download, Eye
} from 'lucide-react';
import { weeklyMeetingAPI } from '../services/api';

const WeeklyMeeting = () => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({
    liveProjects: true,
    completedProjects: true,
    billing: true
  });

  // Form state
  const [formData, setFormData] = useState({
    department: '',
    department_rep: '',
    meeting_date: new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
    meeting_time: '10:00',
    meeting_chair: 'Subramani',
    meeting_attendees: '',
    meeting_agenda: '',
    meeting_notes: '',
    weekly_highlights: '',
    decisions: '',
    issues: '',
    billing_target: 0,
    billing_achieved: 0,
    order_target: 0,
    order_achieved: 0,
    action_items: [],
    week_number: Math.ceil(new Date().getDate() / 7)
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, meetingsRes, deptRes] = await Promise.all([
        weeklyMeetingAPI.getSummary(),
        weeklyMeetingAPI.getAll(),
        weeklyMeetingAPI.getDepartments()
      ]);
      setSummaryData(summaryRes.data);
      setMeetings(meetingsRes.data);
      setDepartments(deptRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMeeting) {
        await weeklyMeetingAPI.update(editingMeeting.id, formData);
      } else {
        await weeklyMeetingAPI.create(formData);
      }
      setShowModal(false);
      setEditingMeeting(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving meeting:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this meeting record?')) {
      try {
        await weeklyMeetingAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting meeting:', error);
      }
    }
  };

  const handleView = (meeting) => {
    setViewingMeeting(meeting);
    setShowViewModal(true);
  };

  const handleDownloadPDF = (meeting) => {
    const pdfUrl = weeklyMeetingAPI.downloadPDF(meeting.id);
    window.open(pdfUrl, '_blank');
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      department: meeting.department || '',
      department_rep: meeting.department_rep || '',
      meeting_date: meeting.meeting_date || '',
      meeting_time: meeting.meeting_time || '10:00',
      meeting_chair: meeting.meeting_chair || 'Subramani',
      meeting_attendees: meeting.meeting_attendees || '',
      meeting_agenda: meeting.meeting_agenda || '',
      meeting_notes: meeting.meeting_notes || '',
      weekly_highlights: meeting.weekly_highlights || '',
      decisions: meeting.decisions || '',
      issues: meeting.issues || '',
      billing_target: meeting.billing_target || 0,
      billing_achieved: meeting.billing_achieved || 0,
      order_target: meeting.order_target || 0,
      order_achieved: meeting.order_achieved || 0,
      action_items: meeting.action_items || [],
      week_number: meeting.week_number || 1
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      department: '',
      department_rep: '',
      meeting_date: new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
      meeting_time: '10:00',
      meeting_chair: 'Subramani',
      meeting_attendees: '',
      meeting_agenda: '',
      meeting_notes: '',
      weekly_highlights: '',
      decisions: '',
      issues: '',
      billing_target: 0,
      billing_achieved: 0,
      order_target: 0,
      order_achieved: 0,
      action_items: [],
      week_number: Math.ceil(new Date().getDate() / 7)
    });
  };

  const handleDepartmentChange = (deptCode) => {
    const dept = departments.find(d => d.code === deptCode);
    setFormData(prev => ({
      ...prev,
      department: deptCode,
      department_rep: dept?.rep || ''
    }));
  };

  const addActionItem = () => {
    setFormData(prev => ({
      ...prev,
      action_items: [...prev.action_items, { action: '', assigned_to: '', due_date: '', status: 'Pending' }]
    }));
  };

  const updateActionItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      action_items: prev.action_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeActionItem = (index) => {
    setFormData(prev => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== index)
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Weekly Meeting
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Performance review • Week {summaryData?.current_week?.week_number} • {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingMeeting(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Meeting Record
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'meetings', label: 'Meeting Records', icon: FileText },
            { id: 'projects', label: 'Projects Status', icon: Briefcase }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Briefcase className="text-blue-600" size={20} />
                </div>
                <span className="text-sm text-slate-500">Live Projects</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{summaryData?.live_projects_count || 0}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-50 p-2 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={20} />
                </div>
                <span className="text-sm text-slate-500">Completed (Last Week)</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{summaryData?.last_week_completed_count || 0}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-emerald-50 p-2 rounded-lg">
                  <TrendingUp className="text-emerald-600" size={20} />
                </div>
                <span className="text-sm text-slate-500">Total Billing</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summaryData?.billing_summary?.total_invoiced)}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-50 p-2 rounded-lg">
                  <Target className="text-amber-600" size={20} />
                </div>
                <span className="text-sm text-slate-500">This Week Billing</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summaryData?.billing_summary?.this_week_billing)}</p>
            </div>
          </div>

          {/* Billing by Category */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('billing')}
            >
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                Billing Summary by Category
              </h3>
              {expandedSections.billing ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSections.billing && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">PO Amount</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Invoiced</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summaryData?.category_billing || {}).map(([cat, data]) => (
                      <tr key={cat} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium">{cat}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(data.po_amount)}</td>
                        <td className="py-2 px-3 text-right text-green-600">{formatCurrency(data.invoiced)}</td>
                        <td className="py-2 px-3 text-right text-amber-600">{formatCurrency(data.po_amount - data.invoiced)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold">
                      <td className="py-2 px-3">Total</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(summaryData?.billing_summary?.total_po_amount)}</td>
                      <td className="py-2 px-3 text-right text-green-600">{formatCurrency(summaryData?.billing_summary?.total_invoiced)}</td>
                      <td className="py-2 px-3 text-right text-amber-600">{formatCurrency(summaryData?.billing_summary?.total_balance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Recent Meetings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-blue-600" />
              Recent Meeting Records
            </h3>
            {summaryData?.recent_meetings?.length > 0 ? (
              <div className="space-y-3">
                {summaryData.recent_meetings.slice(0, 5).map(meeting => (
                  <div key={meeting.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Building2 size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{meeting.department}</p>
                        <p className="text-xs text-slate-500">{meeting.meeting_date} • Week {meeting.week_number}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      meeting.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {meeting.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No meeting records yet. Create your first meeting record.</p>
            )}
          </div>
        </div>
      )}

      {/* Meeting Records Tab */}
      {activeTab === 'meetings' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">All Meeting Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Meeting ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Representative</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Week</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {meetings.length > 0 ? meetings.map(meeting => (
                  <tr key={meeting.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleView(meeting)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {meeting.meeting_id}
                      </button>
                    </td>
                    <td className="py-3 px-4">{meeting.department}</td>
                    <td className="py-3 px-4">{meeting.department_rep}</td>
                    <td className="py-3 px-4">{meeting.meeting_date}</td>
                    <td className="py-3 px-4">Week {meeting.week_number}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        meeting.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {meeting.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleView(meeting)}
                        className="p-1 text-slate-400 hover:text-green-600 mr-1"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(meeting)}
                        className="p-1 text-slate-400 hover:text-purple-600 mr-1"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(meeting)}
                        className="p-1 text-slate-400 hover:text-blue-600 mr-1"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(meeting.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No meeting records found. Create your first meeting record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects Status Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Live Projects */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div 
              className="p-4 border-b border-slate-200 flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('liveProjects')}
            >
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                Live Projects ({summaryData?.live_projects_count || 0})
              </h3>
              {expandedSections.liveProjects ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSections.liveProjects && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">PID</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Project</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Team Member</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData?.live_projects?.map(project => (
                      <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-blue-600">{project.pid_no}</td>
                        <td className="py-3 px-4">{project.project_name}</td>
                        <td className="py-3 px-4">{project.client}</td>
                        <td className="py-3 px-4">{project.category}</td>
                        <td className="py-3 px-4">{project.engineer_in_charge}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            project.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                            project.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 rounded-full" 
                                style={{ width: `${project.completion_percentage || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">{project.completion_percentage || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Last Week Completed */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div 
              className="p-4 border-b border-slate-200 flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('completedProjects')}
            >
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600" />
                Recently Completed Projects ({summaryData?.last_week_completed_count || 0})
              </h3>
              {expandedSections.completedProjects ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expandedSections.completedProjects && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">PID</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Project</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Category</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600">PO Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600">Invoiced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData?.last_week_completed?.length > 0 ? summaryData.last_week_completed.map(project => (
                      <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-green-600">{project.pid_no}</td>
                        <td className="py-3 px-4">{project.project_name}</td>
                        <td className="py-3 px-4">{project.client}</td>
                        <td className="py-3 px-4">{project.category}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(project.po_amount)}</td>
                        <td className="py-3 px-4 text-right text-green-600">{formatCurrency(project.invoiced_amount)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No completed projects in the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingMeeting ? 'Edit Meeting Record' : 'New Meeting Record'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingMeeting(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Meeting Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.code} value={dept.code}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Representative</label>
                  <input
                    type="text"
                    value={formData.department_rep}
                    onChange={(e) => setFormData(prev => ({ ...prev, department_rep: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Week Number</label>
                  <select
                    value={formData.week_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, week_number: parseInt(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map(w => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Date *</label>
                  <input
                    type="text"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))}
                    placeholder="DD-MM-YYYY"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Time</label>
                  <input
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, meeting_time: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Chair</label>
                  <input
                    type="text"
                    value={formData.meeting_chair}
                    onChange={(e) => setFormData(prev => ({ ...prev, meeting_chair: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attendees</label>
                <input
                  type="text"
                  value={formData.meeting_attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_attendees: e.target.value }))}
                  placeholder="Names separated by commas"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Targets (for Projects/Sales) */}
              {(formData.department === 'PROJECTS' || formData.department === 'SALES') && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-3">Targets & Achievements</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Billing Target</label>
                      <input
                        type="number"
                        value={formData.billing_target}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_target: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Billing Achieved</label>
                      <input
                        type="number"
                        value={formData.billing_achieved}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_achieved: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Order Target</label>
                      <input
                        type="number"
                        value={formData.order_target}
                        onChange={(e) => setFormData(prev => ({ ...prev, order_target: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Order Achieved</label>
                      <input
                        type="number"
                        value={formData.order_achieved}
                        onChange={(e) => setFormData(prev => ({ ...prev, order_achieved: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Meeting Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Agenda</label>
                <textarea
                  value={formData.meeting_agenda}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_agenda: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Weekly Highlights</label>
                <textarea
                  value={formData.weekly_highlights}
                  onChange={(e) => setFormData(prev => ({ ...prev, weekly_highlights: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Decisions</label>
                  <textarea
                    value={formData.decisions}
                    onChange={(e) => setFormData(prev => ({ ...prev, decisions: e.target.value }))}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issues / Concerns</label>
                  <textarea
                    value={formData.issues}
                    onChange={(e) => setFormData(prev => ({ ...prev, issues: e.target.value }))}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Notes</label>
                <textarea
                  value={formData.meeting_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_notes: e.target.value }))}
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Action Items</label>
                  <button
                    type="button"
                    onClick={addActionItem}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                {formData.action_items.length > 0 && (
                  <div className="space-y-2">
                    {formData.action_items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg">
                        <input
                          type="text"
                          value={item.action}
                          onChange={(e) => updateActionItem(index, 'action', e.target.value)}
                          placeholder="Action"
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={item.assigned_to}
                          onChange={(e) => updateActionItem(index, 'assigned_to', e.target.value)}
                          placeholder="Assigned To"
                          className="w-32 border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={item.due_date}
                          onChange={(e) => updateActionItem(index, 'due_date', e.target.value)}
                          placeholder="Due Date"
                          className="w-28 border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                        <select
                          value={item.status}
                          onChange={(e) => updateActionItem(index, 'status', e.target.value)}
                          className="w-28 border border-slate-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeActionItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingMeeting(null); }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Save size={16} />
                  {editingMeeting ? 'Update Meeting' : 'Save Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Meeting Modal */}
      {showViewModal && viewingMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Meeting Details</h2>
                <p className="text-sm text-blue-600 font-medium">{viewingMeeting.meeting_id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(viewingMeeting)}
                  className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 text-sm"
                >
                  <Download size={16} />
                  Download PDF
                </button>
                <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Meeting Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="font-medium text-slate-900">{viewingMeeting.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Representative</p>
                  <p className="font-medium text-slate-900">{viewingMeeting.department_rep}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium text-slate-900">{viewingMeeting.meeting_date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Week</p>
                  <p className="font-medium text-slate-900">Week {viewingMeeting.week_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Chair</p>
                  <p className="font-medium text-slate-900">{viewingMeeting.meeting_chair || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium text-slate-900">{viewingMeeting.meeting_time || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Attendees</p>
                  <p className="font-medium text-slate-900">{viewingMeeting.meeting_attendees || '-'}</p>
                </div>
              </div>

              {/* Targets & Achievements */}
              {(viewingMeeting.billing_target > 0 || viewingMeeting.order_target > 0) && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Target size={18} className="text-amber-600" />
                    Targets & Achievements
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-600">Billing Target</p>
                      <p className="font-semibold text-blue-900">{formatCurrency(viewingMeeting.billing_target)}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-green-600">Billing Achieved</p>
                      <p className="font-semibold text-green-900">{formatCurrency(viewingMeeting.billing_achieved)}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600">Order Target</p>
                      <p className="font-semibold text-purple-900">{formatCurrency(viewingMeeting.order_target)}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg">
                      <p className="text-xs text-emerald-600">Order Achieved</p>
                      <p className="font-semibold text-emerald-900">{formatCurrency(viewingMeeting.order_achieved)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Sections */}
              {viewingMeeting.meeting_agenda && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Meeting Agenda</h3>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{viewingMeeting.meeting_agenda}</p>
                </div>
              )}

              {viewingMeeting.weekly_highlights && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Weekly Highlights</h3>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{viewingMeeting.weekly_highlights}</p>
                </div>
              )}

              {viewingMeeting.decisions && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Decisions</h3>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{viewingMeeting.decisions}</p>
                </div>
              )}

              {viewingMeeting.issues && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Issues / Concerns</h3>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{viewingMeeting.issues}</p>
                </div>
              )}

              {viewingMeeting.meeting_notes && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Meeting Notes</h3>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap">{viewingMeeting.meeting_notes}</p>
                </div>
              )}

              {/* Action Items */}
              {viewingMeeting.action_items && viewingMeeting.action_items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Action Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-slate-600">#</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600">Action</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600">Assigned To</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600">Due Date</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingMeeting.action_items.map((item, index) => (
                          <tr key={index} className="border-b border-slate-100">
                            <td className="py-2 px-3">{index + 1}</td>
                            <td className="py-2 px-3">{item.action}</td>
                            <td className="py-2 px-3">{item.assigned_to}</td>
                            <td className="py-2 px-3">{item.due_date}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingMeeting);
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Edit2 size={16} />
                  Edit Meeting
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMeeting;
