/**
 * Weekly Meetings - Business Hub Tab
 * 
 * Consolidates: Department meeting minutes from all departments
 * Purpose: Central view of all weekly meeting records
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Users, Clock, FileText, Plus, Search, Filter,
  RefreshCw, Eye, Edit2, ChevronDown, Building2, CheckCircle,
  AlertCircle, MessageSquare, Target
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

const DEPARTMENTS = [
  { id: 'PROJECTS', name: 'Projects & Services', color: 'violet' },
  { id: 'SALES', name: 'Sales & Marketing', color: 'blue' },
  { id: 'PURCHASE', name: 'Purchase', color: 'amber' },
  { id: 'ACCOUNTS', name: 'Accounts', color: 'rose' },
  { id: 'FINANCE', name: 'Finance', color: 'green' },
  { id: 'HR', name: 'HR & Admin', color: 'orange' },
  { id: 'EXPORTS', name: 'Exports', color: 'cyan' },
  { id: 'OPERATIONS', name: 'Operations', color: 'slate' }
];

const WeeklyMeetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/weekly-meetings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Sort by date descending
        const sorted = (data || []).sort((a, b) => {
          const dateA = new Date(a.meeting_date?.split('-').reverse().join('-') || 0);
          const dateB = new Date(b.meeting_date?.split('-').reverse().join('-') || 0);
          return dateB - dateA;
        });
        setMeetings(sorted);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !searchTerm || 
      meeting.meeting_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.department_rep?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !deptFilter || meeting.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const getDeptConfig = (deptId) => {
    return DEPARTMENTS.find(d => d.id === deptId) || { name: deptId, color: 'slate' };
  };

  const getWeekLabel = (meeting) => {
    return `Week ${meeting.week_number || '-'}, ${meeting.month || '-'}/${meeting.year || '-'}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  };

  // Group meetings by week
  const groupedMeetings = filteredMeetings.reduce((groups, meeting) => {
    const key = `${meeting.year}-W${meeting.week_number}`;
    if (!groups[key]) {
      groups[key] = {
        label: getWeekLabel(meeting),
        meetings: []
      };
    }
    groups[key].meetings.push(meeting);
    return groups;
  }, {});

  return (
    <div className="space-y-6" data-testid="weekly-meetings">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Weekly Meetings</h2>
            <p className="text-sm text-slate-500">Department meeting minutes and action items</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <button
              onClick={fetchMeetings}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} className="text-blue-500" />
            <span className="text-sm text-slate-600">Total Meetings</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{meetings.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={18} className="text-violet-500" />
            <span className="text-sm text-slate-600">Departments Active</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {new Set(meetings.map(m => m.department)).size}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={18} className="text-amber-500" />
            <span className="text-sm text-slate-600">Action Items</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {meetings.reduce((sum, m) => sum + (m.action_items?.length || 0), 0)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-500" />
            <span className="text-sm text-slate-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {meetings.filter(m => m.status === 'Completed').length}
          </p>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No meetings found</h3>
          <p className="text-sm text-slate-500">Weekly meeting records will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMeetings).map(([key, group]) => (
            <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">{group.label}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {group.meetings.map((meeting) => {
                  const deptConfig = getDeptConfig(meeting.department);
                  const actionItems = meeting.action_items || [];
                  const completedActions = actionItems.filter(a => a.status === 'Completed').length;
                  
                  return (
                    <div 
                      key={meeting.id}
                      className="p-4 hover:bg-slate-50 cursor-pointer"
                      onClick={() => { setSelectedMeeting(meeting); setShowDetailModal(true); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg bg-${deptConfig.color}-100`}>
                            <Building2 size={20} className={`text-${deptConfig.color}-600`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-800">{meeting.meeting_id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${deptConfig.color}-100 text-${deptConfig.color}-700`}>
                                {deptConfig.name}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">
                              {formatDate(meeting.meeting_date)} • Chaired by {meeting.meeting_chair || '-'}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              Rep: {meeting.department_rep || '-'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {meeting.status || 'Draft'}
                          </span>
                          {actionItems.length > 0 && (
                            <p className="text-xs text-slate-500 mt-2">
                              Actions: {completedActions}/{actionItems.length}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {meeting.weekly_highlights && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {meeting.weekly_highlights}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedMeeting.meeting_id}</h3>
                <p className="text-sm text-slate-500">
                  {getDeptConfig(selectedMeeting.department).name} • {formatDate(selectedMeeting.meeting_date)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Meeting Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Department Rep</label>
                  <p className="font-medium text-slate-800">{selectedMeeting.department_rep || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Chaired By</label>
                  <p className="font-medium text-slate-800">{selectedMeeting.meeting_chair || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Attendees</label>
                  <p className="font-medium text-slate-800">{selectedMeeting.meeting_attendees || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedMeeting.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedMeeting.status || 'Draft'}
                  </span>
                </div>
              </div>

              {/* Targets */}
              {(selectedMeeting.billing_target > 0 || selectedMeeting.order_target > 0) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3">Targets & Achievements</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedMeeting.billing_target > 0 && (
                      <div>
                        <span className="text-sm text-blue-600">Billing</span>
                        <p className="font-semibold text-blue-800">
                          ₹{(selectedMeeting.billing_achieved || 0).toLocaleString('en-IN')} / 
                          ₹{selectedMeeting.billing_target.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {selectedMeeting.order_target > 0 && (
                      <div>
                        <span className="text-sm text-blue-600">Orders</span>
                        <p className="font-semibold text-blue-800">
                          ₹{(selectedMeeting.order_achieved || 0).toLocaleString('en-IN')} / 
                          ₹{selectedMeeting.order_target.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Weekly Highlights */}
              {selectedMeeting.weekly_highlights && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Weekly Highlights</h4>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedMeeting.weekly_highlights}</p>
                </div>
              )}

              {/* Meeting Notes */}
              {selectedMeeting.meeting_notes && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">Meeting Notes</h4>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedMeeting.meeting_notes}</p>
                </div>
              )}

              {/* Action Items */}
              {selectedMeeting.action_items?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Action Items</h4>
                  <div className="space-y-2">
                    {selectedMeeting.action_items.map((action, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${
                        action.status === 'Completed' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-slate-800">{action.action}</p>
                            <p className="text-sm text-slate-500 mt-1">
                              Assigned to: {action.assigned_to} • Due: {action.due_date || '-'}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            action.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            action.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {action.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {selectedMeeting.issues && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Issues
                  </h4>
                  <p className="text-red-700 whitespace-pre-wrap">{selectedMeeting.issues}</p>
                </div>
              )}

              {/* Decisions */}
              {selectedMeeting.decisions && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle size={16} />
                    Decisions
                  </h4>
                  <p className="text-green-700 whitespace-pre-wrap">{selectedMeeting.decisions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMeetings;
