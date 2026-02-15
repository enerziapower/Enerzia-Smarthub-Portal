import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, CheckCircle, Circle, Clock, User, 
  Filter, Search, RefreshCw, Loader2,
  ChevronDown, ChevronRight, Plus, X, Save, Calendar, Trash2, Edit2,
  MapPin, Download, Printer, Building2, Users, Send
} from 'lucide-react';
import { departmentTeamAPI, departmentTasksAPI } from '../services/api';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const DEPARTMENTS = [
  { id: 'projects', name: 'Projects Dept' },
  { id: 'accounts', name: 'Accounts Dept' },
  { id: 'sales', name: 'Sales Dept' },
  { id: 'purchase', name: 'Purchase Dept' },
  { id: 'exports', name: 'Exports Dept' },
  { id: 'finance', name: 'Finance Dept' },
  { id: 'hr', name: 'HR & Admin Dept' },
  { id: 'operations', name: 'Operations Dept' },
];

const TASK_TYPES = [
  'Daily Task',
  'Meeting',
  'Follow-up',
  'Documentation',
  'Review',
  'Client Visit',
  'Internal Work',
  'Training',
  'Other'
];

// Pre-Project specific task types
const PRE_PROJECT_TASK_TYPES = [
  'Pre-Site Visit',
  'Site Survey',
  'Feasibility Study',
  'Quotation Preparation',
  'Client Meeting',
  'Technical Assessment',
  'Documentation',
  'Follow-up',
  'Other'
];

const DepartmentWorkPlanner = ({ department, departmentName }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [filterMember, setFilterMember] = useState('');
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('workplan');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);  // Track task being edited
  const [savingTask, setSavingTask] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    assigned_to_department: department,
    task_type: 'Daily Task',
    scheduled_date: getTodayDate(),
    priority: 'Medium',
    location: '',
    status: 'Pending',
    // Pre-Project Task fields
    is_pre_project: false,
    customer_name: '',
    customer_site: '',
    customer_contact: ''
  });

  const [stats, setStats] = useState({
    totalTasks: 0,
    todayTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function formatDateHeader(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[date.getDay()];
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy} (${day})`;
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  useEffect(() => {
    loadData();
  }, [department]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load team members from current department
      const teamRes = await departmentTeamAPI.getTeam(department);
      const activeMembers = teamRes.data.filter(e => e.is_active !== false);
      setTeamMembers(activeMembers);

      // Load all team members from all departments for cross-department assignment
      const allMembersPromises = DEPARTMENTS.map(dept => 
        departmentTeamAPI.getTeam(dept.id).catch(() => ({ data: [] }))
      );
      const allMembersRes = await Promise.all(allMembersPromises);
      const allMembers = [];
      allMembersRes.forEach((res, idx) => {
        if (res.data) {
          res.data.filter(e => e.is_active !== false).forEach(member => {
            allMembers.push({ ...member, department: DEPARTMENTS[idx].id, departmentName: DEPARTMENTS[idx].name });
          });
        }
      });
      setAllTeamMembers(allMembers);

      // Load tasks for this department
      const tasksRes = await departmentTasksAPI.getByDepartment(department);
      const deptTasks = tasksRes.data || [];
      setTasks(deptTasks);

      // Calculate stats
      const today = getTodayDate();
      const todayTasks = deptTasks.filter(t => t.scheduled_date === today);
      const pendingTasks = deptTasks.filter(t => t.status !== 'Completed');
      const completedTasks = deptTasks.filter(t => t.status === 'Completed');

      setStats({
        totalTasks: deptTasks.length,
        todayTasks: todayTasks.length,
        pendingTasks: pendingTasks.length,
        completedTasks: completedTasks.length,
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }
    if (!newTask.assigned_to) {
      alert('Please select a team member');
      return;
    }

    setSavingTask(true);
    try {
      if (editingTask) {
        // Update existing task
        const taskToUpdate = {
          ...newTask,
          updated_at: new Date().toISOString()
        };
        await departmentTasksAPI.update(editingTask.id, taskToUpdate);
      } else {
        // Create new task
        const taskToAdd = {
          ...newTask,
          department: department,
          created_at: new Date().toISOString(),
          created_by: department
        };
        await departmentTasksAPI.create(taskToAdd);
      }
      await loadData();
      setShowAddTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setSavingTask(false);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title || '',
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      assigned_to_department: task.assigned_to_department || department,
      task_type: task.task_type || 'Daily Task',
      scheduled_date: task.scheduled_date || getTodayDate(),
      priority: task.priority || 'Medium',
      location: task.location || '',
      status: task.status || 'Pending',
      // Pre-Project Task fields
      is_pre_project: task.is_pre_project || false,
      customer_name: task.customer_name || '',
      customer_site: task.customer_site || '',
      customer_contact: task.customer_contact || ''
    });
    setShowAddTaskModal(true);
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setNewTask({
      title: '',
      description: '',
      assigned_to: '',
      assigned_to_department: department,
      task_type: 'Daily Task',
      scheduled_date: filterDate || getTodayDate(),
      priority: 'Medium',
      location: '',
      status: 'Pending',
      // Pre-Project Task fields
      is_pre_project: false,
      customer_name: '',
      customer_site: '',
      customer_contact: ''
    });
  };

  const toggleTaskStatus = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      await departmentTasksAPI.update(taskId, { status: newStatus });
      await loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await departmentTasksAPI.delete(taskId);
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      
      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${departmentName} - Work Plan`, 14, 15);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${formatDateHeader(filterDate)}`, 14, 23);

      // Filter tasks for the selected date
      const filteredTasks = tasks.filter(task => {
        if (filterDate && task.scheduled_date !== filterDate) return false;
        if (filterMember && task.assigned_to !== filterMember) return false;
        return true;
      });

      const tableData = filteredTasks.map((task, index) => [
        index + 1,
        task.assigned_to || '-',
        task.location || '-',
        task.title,
        task.task_type || 'Daily Task',
        task.status
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['S/No', 'Employee', 'Location', 'Work', 'Type', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 40 },
          2: { cellWidth: 45 },
          3: { cellWidth: 80 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 }
        }
      });

      doc.save(`WorkPlan_${department}_${filterDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Filter tasks based on search, date, and member
  const filteredTasks = tasks.filter(task => {
    if (filterDate && task.scheduled_date !== filterDate) return false;
    if (filterMember && task.assigned_to !== filterMember) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        task.title?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        task.assigned_to?.toLowerCase().includes(search) ||
        task.location?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Group tasks by member for the member view
  const tasksByMember = {};
  filteredTasks.forEach(task => {
    const member = task.assigned_to || 'Unassigned';
    if (!tasksByMember[member]) {
      tasksByMember[member] = [];
    }
    tasksByMember[member].push(task);
  });

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Work Planner</h1>
          <p className="text-slate-500 mt-1">Plan and manage daily tasks for {departmentName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generatePDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {generatingPDF ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Export PDF
          </button>
          <button
            onClick={() => {
              resetTaskForm();
              setShowAddTaskModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            data-testid="add-task-btn"
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <CalendarCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Tasks</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Today&apos;s Tasks</p>
              <p className="text-2xl font-bold text-amber-600">{stats.todayTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-lg">
              <Circle size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.completedTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Team Member Filter */}
          <div className="flex items-center gap-2">
            <User size={18} className="text-slate-400" />
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="">All Members</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
          </button>

          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('workplan')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                activeView === 'workplan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Work Plan
            </button>
            <button
              onClick={() => setActiveView('members')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                activeView === 'members' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              By Member
            </button>
          </div>
        </div>
      </div>

      {/* Work Plan Header */}
      {activeView === 'workplan' && filterDate && (
        <div className="bg-slate-800 text-white rounded-xl p-4">
          <h2 className="text-lg font-semibold">Work Plan - {formatDateHeader(filterDate)}</h2>
          <p className="text-slate-300 text-sm mt-1">{departmentName}</p>
        </div>
      )}

      {/* Tasks List - Work Plan View */}
      {activeView === 'workplan' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">S/No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <CalendarCheck size={48} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No tasks scheduled</p>
                      <p className="text-slate-400 text-sm mt-1">Add tasks for this date to get started</p>
                      <button
                        onClick={() => {
                          resetTaskForm();
                          setShowAddTaskModal(true);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Add Task
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, index) => (
                  <tr key={task.id} className={`hover:bg-slate-50 ${task.is_pre_project ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <User size={14} className="text-slate-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{task.assigned_to || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {task.is_pre_project && task.customer_site ? (
                        <div className="flex items-center gap-1">
                          <Building2 size={14} className="text-amber-500" />
                          <span className="text-amber-700">{task.customer_site}</span>
                        </div>
                      ) : task.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-slate-400" />
                          {task.location}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {task.is_pre_project && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded mb-1">
                            Pre-Project
                          </span>
                        )}
                        <p className="text-sm font-medium text-slate-800">{task.title}</p>
                        {task.is_pre_project && task.customer_name && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            <Building2 size={10} className="inline mr-1" />
                            {task.customer_name}
                            {task.customer_contact && ` • ${task.customer_contact}`}
                          </p>
                        )}
                        {task.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${task.is_pre_project ? 'bg-amber-100 text-amber-700 border-amber-200' : getPriorityColor(task.priority)}`}>
                        {task.task_type || 'Daily Task'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className={`p-1.5 rounded hover:bg-slate-100 ${
                            task.status === 'Completed' ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                          title={task.status === 'Completed' ? 'Mark Pending' : 'Mark Complete'}
                        >
                          {task.status === 'Completed' ? <CheckCircle size={16} /> : <Circle size={16} />}
                        </button>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Task"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tasks List - By Member View */}
      {activeView === 'members' && (
        <div className="space-y-4">
          {Object.keys(tasksByMember).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Users size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No tasks found</p>
              <p className="text-slate-400 text-sm mt-1">Add tasks to see them grouped by member</p>
            </div>
          ) : (
            Object.entries(tasksByMember).map(([member, memberTasks]) => (
              <div key={member} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{member}</h3>
                      <p className="text-xs text-slate-500">{memberTasks.length} task(s)</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {memberTasks.map((task, index) => (
                    <div key={task.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-sm text-slate-400 w-6">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{task.title}</p>
                          {task.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} /> {task.location}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className={`p-1.5 rounded hover:bg-slate-100 ${
                            task.status === 'Completed' ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {task.status === 'Completed' ? <CheckCircle size={16} /> : <Circle size={16} />}
                        </button>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Task"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                {editingTask ? <Edit2 size={20} /> : <Plus size={20} />} {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
              <button
                onClick={() => { setShowAddTaskModal(false); setEditingTask(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Pre-Project Task Toggle */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTask.is_pre_project}
                    onChange={(e) => setNewTask(prev => ({ 
                      ...prev, 
                      is_pre_project: e.target.checked,
                      task_type: e.target.checked ? 'Pre-Site Visit' : 'Daily Task'
                    }))}
                    className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-medium text-amber-800">Pre-Project Task</span>
                    <p className="text-xs text-amber-600 mt-0.5">For tasks before project is created (site visits, surveys, etc.)</p>
                  </div>
                </label>
              </div>

              {/* Customer Details - Only shown for Pre-Project Tasks */}
              {newTask.is_pre_project && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 size={16} className="text-slate-500" />
                    Customer Details
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newTask.customer_name}
                      onChange={(e) => setNewTask(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter customer/company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Site Location *</label>
                    <input
                      type="text"
                      value={newTask.customer_site}
                      onChange={(e) => setNewTask(prev => ({ ...prev, customer_site: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      placeholder="Enter site address or location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person / Phone</label>
                    <input
                      type="text"
                      value={newTask.customer_contact}
                      onChange={(e) => setNewTask(prev => ({ ...prev, customer_contact: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g., Mr. Kumar - 9876543210"
                    />
                  </div>
                </div>
              )}
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional details"
                />
              </div>

              {/* Assign To - Department Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To Department</label>
                <select
                  value={newTask.assigned_to_department}
                  onChange={(e) => setNewTask(prev => ({ 
                    ...prev, 
                    assigned_to_department: e.target.value,
                    assigned_to: '' // Reset assigned_to when department changes
                  }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Assign To - Team Member */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To *</label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team member</option>
                  {allTeamMembers
                    .filter(m => m.department === newTask.assigned_to_department)
                    .map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Task Type & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Task Type</label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask(prev => ({ ...prev, task_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {(newTask.is_pre_project ? PRE_PROJECT_TASK_TYPES : TASK_TYPES).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date *</label>
                  <input
                    type="date"
                    value={newTask.scheduled_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newTask.location}
                    onChange={(e) => setNewTask(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Site / Office location"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => { setShowAddTaskModal(false); setEditingTask(null); }}
                className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={savingTask || !newTask.title.trim() || !newTask.assigned_to || 
                  (newTask.is_pre_project && (!newTask.customer_name.trim() || !newTask.customer_site.trim()))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingTask ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingTask ? 'Save Changes' : 'Save Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentWorkPlanner;
