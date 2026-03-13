/**
 * Daily Stand-up (SOM) - Digital Whiteboard for Daily Tasks
 * 
 * Features:
 * - Column-based view by department (Purchase, Sales, Finance, Projects, Export, Accounts, HR, Operations)
 * - Date + Task + Assignee format
 * - Add/Edit/Complete tasks
 * - Filter by date
 * - Printable view
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Calendar, Printer, RefreshCw, Check, X, Edit2, Trash2,
  ChevronLeft, ChevronRight, Users, Clock, CheckCircle2, Circle,
  Filter, Search
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

// Department configuration
const DEPARTMENTS = [
  { id: 'purchase', name: 'PURCHASE', color: 'amber' },
  { id: 'sales', name: 'SALES & MARKETING', color: 'blue' },
  { id: 'finance', name: 'FINANCE', color: 'green' },
  { id: 'projects', name: 'PROJECTS & SERVICES', color: 'violet' },
  { id: 'exports', name: 'EXPORT', color: 'cyan' },
  { id: 'accounts', name: 'ACCOUNTS', color: 'rose' },
  { id: 'hr', name: 'HR', color: 'orange' },
  { id: 'operations', name: 'OPERATIONS', color: 'slate' },
];

const DailyStandup = () => {
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    department: '',
    task: '',
    assignee: '',
    due_date: '',
    status: 'pending'
  });

  // Fetch tasks for selected date
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/som-tasks?date=${selectedDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        console.error('Failed to fetch SOM tasks');
      }
    } catch (error) {
      console.error('Error fetching SOM tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Fetch team members for each department
  const fetchTeamMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/department-team`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Group by department
        const grouped = {};
        data.forEach(member => {
          if (!grouped[member.department]) {
            grouped[member.department] = [];
          }
          grouped[member.department].push(member);
        });
        setTeamMembers(grouped);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchTeamMembers();
  }, [fetchTasks, fetchTeamMembers]);

  // Get tasks for a specific department
  const getTasksForDepartment = (deptId) => {
    return tasks.filter(t => t.department === deptId);
  };

  // Get team string for department
  const getTeamString = (deptId) => {
    const members = teamMembers[deptId] || [];
    if (members.length === 0) return 'No team assigned';
    const names = members.slice(0, 3).map(m => m.name.split(' ')[0]);
    if (members.length > 3) {
      return `Team: ${names.join(', ')}...`;
    }
    return `Team: ${names.join(', ')}`;
  };

  // Handle date navigation
  const navigateDate = (direction) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const options = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  };

  // Format task date
  const formatTaskDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Open add modal for specific department
  const openAddModal = (deptId) => {
    setFormData({
      department: deptId,
      task: '',
      assignee: '',
      due_date: selectedDate,
      status: 'pending'
    });
    setSelectedDepartment(deptId);
    setEditingTask(null);
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (task) => {
    setFormData({
      department: task.department,
      task: task.task,
      assignee: task.assignee,
      due_date: task.due_date,
      status: task.status
    });
    setEditingTask(task);
    setSelectedDepartment(task.department);
    setShowAddModal(true);
  };

  // Save task (create or update)
  const handleSaveTask = async () => {
    if (!formData.task.trim()) {
      toast.error('Please enter a task description');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingTask 
        ? `${API_URL}/api/som-tasks/${editingTask.id}`
        : `${API_URL}/api/som-tasks`;
      
      const response = await fetch(url, {
        method: editingTask ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          som_date: selectedDate
        })
      });

      if (response.ok) {
        toast.success(editingTask ? 'Task updated' : 'Task added');
        setShowAddModal(false);
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save task');
      }
    } catch (error) {
      toast.error('Error saving task');
    }
  };

  // Toggle task status
  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/som-tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      toast.error('Error updating task');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/som-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Task deleted');
        fetchTasks();
      }
    } catch (error) {
      toast.error('Error deleting task');
    }
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  // Get color classes for department
  const getDeptColors = (color) => ({
    header: `bg-${color}-100 border-${color}-300`,
    headerText: `text-${color}-800`,
    border: `border-${color}-200`,
  });

  return (
    <div className="space-y-4" data-testid="daily-standup">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title and Date */}
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                SOM dated {formatDateDisplay(selectedDate)}
              </h2>
              <p className="text-sm text-slate-500">Daily Stand-up Meeting Tasks</p>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            
            <button
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight size={20} />
            </button>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
            >
              Today
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Department Columns */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          {DEPARTMENTS.map((dept) => {
            const deptTasks = getTasksForDepartment(dept.id);
            const completedCount = deptTasks.filter(t => t.status === 'completed').length;
            
            return (
              <div
                key={dept.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                data-testid={`dept-column-${dept.id}`}
              >
                {/* Department Header */}
                <div className={`px-4 py-3 bg-${dept.color}-50 border-b border-${dept.color}-200`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-bold text-${dept.color}-800 text-sm`}>
                        {dept.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getTeamString(dept.id)}
                      </p>
                    </div>
                    <button
                      onClick={() => openAddModal(dept.id)}
                      className={`p-1.5 bg-${dept.color}-100 hover:bg-${dept.color}-200 rounded-lg text-${dept.color}-700`}
                      title="Add Task"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {deptTasks.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-slate-600">
                        {completedCount}/{deptTasks.length} completed
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-${dept.color}-500 rounded-full`}
                          style={{ width: `${(completedCount / deptTasks.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Task List */}
                <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                  {deptTasks.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">
                      No tasks for today
                    </p>
                  ) : (
                    deptTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border ${
                          task.status === 'completed'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleTaskStatus(task)}
                            className={`mt-0.5 ${
                              task.status === 'completed'
                                ? 'text-green-500'
                                : 'text-slate-300 hover:text-slate-500'
                            }`}
                          >
                            {task.status === 'completed' ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <Circle size={18} />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${
                              task.status === 'completed'
                                ? 'text-slate-500 line-through'
                                : 'text-slate-700'
                            }`}>
                              {task.task}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {formatTaskDate(task.due_date)}
                                </span>
                              )}
                              {task.assignee && (
                                <span className="font-medium text-slate-600">
                                  {task.assignee}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 print:hidden">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingTask ? 'Edit Task' : 'Add Task'}
              </h3>
              <p className="text-sm text-slate-500">
                {DEPARTMENTS.find(d => d.id === selectedDepartment)?.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Task Description *
                </label>
                <textarea
                  value={formData.task}
                  onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter task description..."
                  data-testid="task-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assignee
                  </label>
                  <select
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Select assignee</option>
                    {(teamMembers[selectedDepartment] || []).map(member => (
                      <option key={member.id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                data-testid="save-task-btn"
              >
                {editingTask ? 'Update Task' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [data-testid="daily-standup"], [data-testid="daily-standup"] * {
            visibility: visible;
          }
          [data-testid="daily-standup"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DailyStandup;
