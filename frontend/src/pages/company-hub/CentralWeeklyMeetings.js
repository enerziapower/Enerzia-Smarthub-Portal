import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, FileText, ChevronLeft, ChevronRight, 
  CheckCircle, AlertCircle, Clock, Users, Loader2, Edit, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { companyHubAPI } from '../../services/api';
import { toast } from 'sonner';

const CentralWeeklyMeetings = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Get current week dates
  const getWeekDates = (date = new Date()) => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const last = first + 6;
    const firstDay = new Date(curr.setDate(first)).toISOString().split('T')[0];
    const lastDay = new Date(curr.setDate(last)).toISOString().split('T')[0];
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getWeekDates();

  const [formData, setFormData] = useState({
    department: user?.department || 'Projects',
    week_start: firstDay,
    week_end: lastDay,
    tasks_completed: [''],
    tasks_pending: [''],
    blockers: [''],
    next_week_plan: [''],
    notes: ''
  });

  const departments = ['Projects', 'Accounts', 'Sales', 'Purchase', 'Exports', 'Finance', 'HR', 'Operations'];

  useEffect(() => {
    fetchMeetings();
  }, [selectedDepartment]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDepartment !== 'all') {
        params.department = selectedDepartment;
      }
      const res = await companyHubAPI.getWeeklyMeetings(params);
      setMeetings(res.data.meetings || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load weekly meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const cleanedData = {
        ...formData,
        tasks_completed: formData.tasks_completed.filter(t => t.trim()),
        tasks_pending: formData.tasks_pending.filter(t => t.trim()),
        blockers: formData.blockers.filter(t => t.trim()),
        next_week_plan: formData.next_week_plan.filter(t => t.trim()),
      };

      if (editingId) {
        await companyHubAPI.updateWeeklyMeeting(editingId, cleanedData);
        toast.success('Weekly report updated');
      } else {
        await companyHubAPI.createWeeklyMeeting(cleanedData, user?.name || 'User', user?.id);
        toast.success('Weekly report submitted');
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchMeetings();
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error('Failed to save weekly report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    const { firstDay, lastDay } = getWeekDates();
    setFormData({
      department: user?.department || 'Projects',
      week_start: firstDay,
      week_end: lastDay,
      tasks_completed: [''],
      tasks_pending: [''],
      blockers: [''],
      next_week_plan: [''],
      notes: ''
    });
  };

  const handleEdit = (meeting) => {
    setEditingId(meeting.id);
    setFormData({
      department: meeting.department,
      week_start: meeting.week_start,
      week_end: meeting.week_end,
      tasks_completed: meeting.tasks_completed?.length ? meeting.tasks_completed : [''],
      tasks_pending: meeting.tasks_pending?.length ? meeting.tasks_pending : [''],
      blockers: meeting.blockers?.length ? meeting.blockers : [''],
      next_week_plan: meeting.next_week_plan?.length ? meeting.next_week_plan : [''],
      notes: meeting.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this weekly report?')) {
      try {
        await companyHubAPI.deleteWeeklyMeeting(id);
        toast.success('Weekly report deleted');
        fetchMeetings();
      } catch (error) {
        console.error('Error deleting meeting:', error);
        toast.error('Failed to delete report');
      }
    }
  };

  const addListItem = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const updateListItem = (field, index, value) => {
    const updated = [...formData[field]];
    updated[index] = value;
    setFormData({ ...formData, [field]: updated });
  };

  const removeListItem = (field, index) => {
    if (formData[field].length > 1) {
      const updated = formData[field].filter((_, i) => i !== index);
      setFormData({ ...formData, [field]: updated });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="central-weekly-meetings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Weekly Meetings</h1>
          <p className="text-slate-500 mt-1">Central repository for department weekly reports</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          data-testid="submit-report-btn"
        >
          <Plus size={18} />
          Submit Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-600">Filter by Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Reports</p>
              <p className="text-xl font-bold text-slate-800">{meetings.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-green-600">Tasks Completed</p>
              <p className="text-xl font-bold text-green-700">
                {meetings.reduce((sum, m) => sum + (m.tasks_completed?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-amber-600">Tasks Pending</p>
              <p className="text-xl font-bold text-amber-700">
                {meetings.reduce((sum, m) => sum + (m.tasks_pending?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-red-600">Blockers</p>
              <p className="text-xl font-bold text-red-700">
                {meetings.reduce((sum, m) => sum + (m.blockers?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Weekly Reports</h2>
        </div>
        {meetings.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="mx-auto mb-3 text-slate-300" size={48} />
            <p>No weekly reports found</p>
            <p className="text-sm">Submit your first weekly report to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="p-4 hover:bg-slate-50" data-testid={`meeting-${meeting.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {meeting.department}
                      </span>
                      <span className="text-sm text-slate-500">
                        Week: {new Date(meeting.week_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(meeting.week_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <h4 className="text-xs font-semibold text-green-600 uppercase mb-1">Completed ({meeting.tasks_completed?.length || 0})</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {meeting.tasks_completed?.slice(0, 2).map((task, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{task}</span>
                            </li>
                          ))}
                          {meeting.tasks_completed?.length > 2 && (
                            <li className="text-xs text-slate-400">+{meeting.tasks_completed.length - 2} more</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-amber-600 uppercase mb-1">Pending ({meeting.tasks_pending?.length || 0})</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          {meeting.tasks_pending?.slice(0, 2).map((task, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Clock size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{task}</span>
                            </li>
                          ))}
                          {meeting.tasks_pending?.length > 2 && (
                            <li className="text-xs text-slate-400">+{meeting.tasks_pending.length - 2} more</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    
                    {meeting.blockers?.length > 0 && (
                      <div className="mt-3 p-2 bg-red-50 rounded-lg">
                        <h4 className="text-xs font-semibold text-red-600 uppercase mb-1">Blockers</h4>
                        <ul className="text-sm text-red-700">
                          {meeting.blockers.slice(0, 2).map((blocker, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{blocker}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>Submitted by: {meeting.submitted_by}</span>
                      <span>{new Date(meeting.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(meeting)}
                      className="p-2 hover:bg-slate-200 rounded-lg" 
                      title="Edit"
                    >
                      <Edit size={16} className="text-slate-500" />
                    </button>
                    <button 
                      onClick={() => handleDelete(meeting.id)}
                      className="p-2 hover:bg-red-50 rounded-lg" 
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Weekly Report' : 'Submit Weekly Report'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Week Start</label>
                    <input
                      type="date"
                      value={formData.week_start}
                      onChange={(e) => setFormData({ ...formData, week_start: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Week End</label>
                    <input
                      type="date"
                      value={formData.week_end}
                      onChange={(e) => setFormData({ ...formData, week_end: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Tasks Completed */}
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">Tasks Completed</label>
                {formData.tasks_completed.map((task, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => updateListItem('tasks_completed', idx, e.target.value)}
                      placeholder="Task completed this week"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <button type="button" onClick={() => removeListItem('tasks_completed', idx)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addListItem('tasks_completed')} className="text-sm text-green-600 hover:underline">+ Add task</button>
              </div>

              {/* Tasks Pending */}
              <div>
                <label className="block text-sm font-medium text-amber-700 mb-2">Tasks Pending</label>
                {formData.tasks_pending.map((task, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => updateListItem('tasks_pending', idx, e.target.value)}
                      placeholder="Pending task"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <button type="button" onClick={() => removeListItem('tasks_pending', idx)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addListItem('tasks_pending')} className="text-sm text-amber-600 hover:underline">+ Add task</button>
              </div>

              {/* Blockers */}
              <div>
                <label className="block text-sm font-medium text-red-700 mb-2">Blockers</label>
                {formData.blockers.map((blocker, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={blocker}
                      onChange={(e) => updateListItem('blockers', idx, e.target.value)}
                      placeholder="Any blocker or issue"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <button type="button" onClick={() => removeListItem('blockers', idx)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addListItem('blockers')} className="text-sm text-red-600 hover:underline">+ Add blocker</button>
              </div>

              {/* Next Week Plan */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">Next Week Plan</label>
                {formData.next_week_plan.map((plan, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={plan}
                      onChange={(e) => updateListItem('next_week_plan', idx, e.target.value)}
                      placeholder="Planned for next week"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <button type="button" onClick={() => removeListItem('next_week_plan', idx)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addListItem('next_week_plan')} className="text-sm text-blue-600 hover:underline">+ Add plan</button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={submitting}
                  data-testid="meeting-submit-btn"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? 'Update Report' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralWeeklyMeetings;
