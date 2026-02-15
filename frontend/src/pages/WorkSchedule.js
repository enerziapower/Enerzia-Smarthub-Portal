import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, CheckCircle, Circle, Clock, User, 
  Filter, Search, RefreshCw, AlertTriangle, ClipboardList, Loader2,
  ChevronDown, ChevronRight, Plus, X, Save, Calendar, Package, Users, Trash2, Edit2,
  MapPin, FileText, Download, Printer, Eye, Share2, Building2
} from 'lucide-react';
import { projectsAPI, departmentTeamAPI, departmentTasksAPI, settingsAPI } from '../services/api';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { DatePicker } from '../components/ui/date-picker';

// Import sub-components
import { AddTaskModal, WorkPlanView, ProjectsListView } from '../components/WorkSchedule';

const WorkSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [preProjectTasks, setPreProjectTasks] = useState([]);  // NEW: Pre-project tasks
  const [customers, setCustomers] = useState([]);  // NEW: Domestic customers list
  const [filterEngineer, setFilterEngineer] = useState('');
  const [filterDate, setFilterDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('workplan');
  const [expandedProjects, setExpandedProjects] = useState({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);  // Track task being edited
  const [newTask, setNewTask] = useState({ 
    description: '', 
    assigned_to: '', 
    site_location: '',
    scheduled_date: getTodayDate(),
    priority: 'Medium',
    status: 'Pending',
    // Pre-Project Task fields
    is_pre_project: false,
    customer_name: '',
    customer_site: '',
    customer_contact: '',
    task_type: ''
  });
  const [savingTask, setSavingTask] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [stats, setStats] = useState({
    ongoingProjects: 0,
    completedProjects: 0,
    todayTasks: 0,
    pendingTasks: 0,
    preProjectTasks: 0,  // NEW: Pre-project tasks count
  });

  // Utility functions
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Ongoing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'On Hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Data loading
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, teamRes, deptTasksRes, customersRes] = await Promise.all([
        projectsAPI.getAll(),
        departmentTeamAPI.getTeam('projects'),
        departmentTasksAPI.getByDepartment('PROJECTS'),  // Fetch pre-project tasks
        settingsAPI.getDomesticClients(),  // Fetch domestic customers
      ]);
      
      setTeamMembers(teamRes.data.filter(e => e.is_active !== false));
      setCustomers(customersRes.data || []);  // Set customers list
      
      const allProjects = projectsRes.data;
      const ongoing = allProjects.filter(p => p.status !== 'Completed');
      const completed = allProjects.filter(p => p.status === 'Completed');
      
      setProjects(allProjects);
      
      // Filter pre-project tasks from department tasks
      const preProj = (deptTasksRes.data || []).filter(t => t.is_pre_project === true);
      setPreProjectTasks(preProj);
      
      // Extract all tasks from projects
      const allTasks = [];
      allProjects.forEach(project => {
        if (project.scheduled_tasks && project.scheduled_tasks.length > 0) {
          project.scheduled_tasks.forEach(task => {
            allTasks.push({
              ...task,
              project_id: project.id,
              project_pid: project.pid_no,
              project_name: project.project_name,
              project_client: project.client,
              project_location: project.location,
            });
          });
        }
      });
      setTasks(allTasks);
      
      // Calculate stats
      const today = getTodayDate();
      const todayTasks = allTasks.filter(t => t.scheduled_date === today);
      const pendingTasks = allTasks.filter(t => t.status !== 'Completed');
      const todayPreProj = preProj.filter(t => t.scheduled_date === today || t.due_date === today);
      
      setStats({
        ongoingProjects: ongoing.length,
        completedProjects: completed.length,
        todayTasks: todayTasks.length + todayPreProj.length,
        pendingTasks: pendingTasks.length,
        preProjectTasks: preProj.filter(t => t.status !== 'Completed').length,
      });
      
      // Auto-expand first few ongoing projects
      const initialExpanded = {};
      ongoing.slice(0, 3).forEach(p => {
        initialExpanded[p.id] = true;
      });
      setExpandedProjects(initialExpanded);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Task handlers
  const toggleProjectExpanded = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const openAddTaskModal = (project) => {
    setSelectedProjectForTask(project);
    setEditingTask(null);  // Reset editing task when adding new
    setNewTask({
      description: '',
      assigned_to: '',
      site_location: project?.location || '',
      scheduled_date: filterDate || getTodayDate(),
      priority: 'Medium',
      status: 'Pending'
    });
    setShowAddTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!newTask.description.trim()) {
      alert('Please enter a task description');
      return;
    }
    if (!newTask.assigned_to) {
      alert('Please select a team member');
      return;
    }
    
    // Validation for pre-project tasks
    if (newTask.is_pre_project) {
      if (!newTask.customer_name?.trim()) {
        alert('Please enter customer name');
        return;
      }
      if (!newTask.customer_site?.trim()) {
        alert('Please enter site location');
        return;
      }
    } else if (!selectedProjectForTask) {
      alert('Please select a project');
      return;
    }

    setSavingTask(true);
    try {
      if (newTask.is_pre_project) {
        // Save pre-project task using department tasks API
        const preProjectTask = {
          title: newTask.description,
          description: newTask.description,
          assigned_to: newTask.assigned_to,
          assigned_to_department: 'PROJECTS',
          task_type: newTask.task_type || 'Pre-Site Visit',
          scheduled_date: newTask.scheduled_date,
          due_date: newTask.scheduled_date,
          priority: newTask.priority,
          status: newTask.status || 'Pending',
          is_pre_project: true,
          customer_name: newTask.customer_name,
          customer_site: newTask.customer_site,
          customer_contact: newTask.customer_contact
        };
        
        if (editingTask && editingTask.is_pre_project) {
          // Update existing pre-project task
          await departmentTasksAPI.update(editingTask.id, preProjectTask);
        } else {
          // Create new pre-project task
          await departmentTasksAPI.create(preProjectTask);
        }
      } else {
        // Original project task logic
        const project = projects.find(p => p.id === selectedProjectForTask.id);
        if (!project) return;

        const existingTasks = project.scheduled_tasks || [];
        
        if (editingTask && !editingTask.is_pre_project) {
          // Update existing task
          const updatedTasks = existingTasks.map(task => {
            if (task.id === editingTask.id) {
              return {
                ...task,
                description: newTask.description,
                assigned_to: newTask.assigned_to,
                site_location: newTask.site_location || project.location,
                scheduled_date: newTask.scheduled_date,
                priority: newTask.priority,
                status: newTask.status,
                updated_at: new Date().toISOString()
              };
            }
            return task;
          });
          await projectsAPI.update(selectedProjectForTask.id, { scheduled_tasks: updatedTasks });
        } else {
          // Create new task
          const taskToAdd = {
            id: `task-${Date.now()}`,
            description: newTask.description,
            assigned_to: newTask.assigned_to,
            site_location: newTask.site_location || project.location,
            scheduled_date: newTask.scheduled_date,
            priority: newTask.priority,
            status: 'Pending',
            created_at: new Date().toISOString()
          };
          await projectsAPI.update(selectedProjectForTask.id, { 
            scheduled_tasks: [...existingTasks, taskToAdd] 
          });
        }
      }
      
      await loadData();
      setShowAddTaskModal(false);
      setSelectedProjectForTask(null);
      setEditingTask(null);
      resetNewTask();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setSavingTask(false);
    }
  };
  
  const resetNewTask = () => {
    setNewTask({
      description: '', 
      assigned_to: '', 
      site_location: '',
      scheduled_date: getTodayDate(),
      priority: 'Medium',
      status: 'Pending',
      is_pre_project: false,
      customer_name: '',
      customer_site: '',
      customer_contact: '',
      task_type: ''
    });
  };

  const handleEditTask = (project, task) => {
    setSelectedProjectForTask(project);
    setEditingTask(task);
    setNewTask({
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      site_location: task.site_location || project?.location || '',
      scheduled_date: task.scheduled_date || getTodayDate(),
      priority: task.priority || 'Medium',
      status: task.status || 'Pending',
      is_pre_project: false,
      customer_name: '',
      customer_site: '',
      customer_contact: '',
      task_type: ''
    });
    setShowAddTaskModal(true);
  };
  
  // NEW: Handle editing pre-project tasks
  const handleEditPreProjectTask = (task) => {
    setSelectedProjectForTask(null);
    setEditingTask({ ...task, is_pre_project: true });
    setNewTask({
      description: task.title || task.description || '',
      assigned_to: task.assigned_to || '',
      site_location: '',
      scheduled_date: task.scheduled_date || task.due_date || getTodayDate(),
      priority: task.priority || 'Medium',
      status: task.status || 'Pending',
      is_pre_project: true,
      customer_name: task.customer_name || '',
      customer_site: task.customer_site || '',
      customer_contact: task.customer_contact || '',
      task_type: task.task_type || 'Pre-Site Visit'
    });
    setShowAddTaskModal(true);
  };
  
  // NEW: Toggle pre-project task status
  const togglePreProjectTaskStatus = async (taskId) => {
    try {
      const task = preProjectTasks.find(t => t.id === taskId);
      if (!task) return;
      
      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      await departmentTasksAPI.update(taskId, { status: newStatus });
      await loadData();
    } catch (error) {
      console.error('Error updating pre-project task status:', error);
    }
  };
  
  // NEW: Delete pre-project task
  const deletePreProjectTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this pre-project task?')) return;
    
    try {
      await departmentTasksAPI.delete(taskId);
      await loadData();
    } catch (error) {
      console.error('Error deleting pre-project task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const toggleTaskStatus = async (projectId, taskId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedTasks = (project.scheduled_tasks || []).map(task => {
        if (task.id === taskId) {
          return { ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' };
        }
        return task;
      });

      await projectsAPI.update(projectId, { scheduled_tasks: updatedTasks });
      await loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const deleteTask = async (projectId, taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedTasks = (project.scheduled_tasks || []).filter(task => task.id !== taskId);
      await projectsAPI.update(projectId, { scheduled_tasks: updatedTasks });
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  // Filter tasks for Work Plan view
  const filteredTasks = tasks.filter(task => {
    const matchesDate = !filterDate || task.scheduled_date === filterDate;
    const matchesEngineer = !filterEngineer || task.assigned_to === filterEngineer;
    const matchesSearch = !searchTerm || 
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project_pid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesEngineer && matchesSearch;
  });
  
  // Filter pre-project tasks for Work Plan view
  const filteredPreProjectTasks = preProjectTasks.filter(task => {
    const taskDate = task.scheduled_date || task.due_date;
    const matchesDate = !filterDate || taskDate === filterDate;
    const matchesEngineer = !filterEngineer || task.assigned_to === filterEngineer;
    const matchesSearch = !searchTerm || 
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesEngineer && matchesSearch;
  });
  
  // Combine all tasks for display
  const allFilteredTasks = [
    ...filteredTasks.map(t => ({ ...t, isPreProject: false })),
    ...filteredPreProjectTasks.map(t => ({ 
      ...t, 
      isPreProject: true,
      description: t.title || t.description,
      site_location: t.customer_site,
      scheduled_date: t.scheduled_date || t.due_date
    }))
  ];

  // Group tasks by team member
  const tasksByMember = {};
  filteredTasks.forEach(task => {
    const member = task.assigned_to || 'Unassigned';
    if (!tasksByMember[member]) {
      tasksByMember[member] = [];
    }
    tasksByMember[member].push(task);
  });

  // PDF Download
  const downloadPDF = () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Work Plan - ${formatDateHeader(filterDate)}`, 148, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Enerzia Power Solutions Pvt. Ltd.', 148, 22, { align: 'center' });
      
      // Use allFilteredTasks to include both project and pre-project tasks
      const tableData = allFilteredTasks.map((task, idx) => {
        if (task.isPreProject) {
          // Pre-project task formatting - removed task_type prefix as per user request
          return [
            idx + 1,
            task.assigned_to || 'Unassigned',
            `${task.customer_name || '-'}\n${task.site_location || task.customer_site || '-'}`,
            `${task.description || task.title || '-'}${task.customer_contact ? '\nContact: ' + task.customer_contact : ''}`,
            'PRE-PROJECT',
            task.status
          ];
        } else {
          // Regular project task formatting
          return [
            idx + 1,
            task.assigned_to || 'Unassigned',
            task.site_location || task.project_location || '-',
            task.description,
            task.project_pid || '-',
            task.status
          ];
        }
      });
      
      autoTable(doc, {
        startY: 30,
        head: [['S/No', 'Employee Name', 'Site & Location', 'Work', 'PID/Type', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15 }, 1: { cellWidth: 40 }, 2: { cellWidth: 50 },
          3: { cellWidth: 70 }, 4: { cellWidth: 35 }, 5: { cellWidth: 25 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 30, left: 15, right: 15 },
        // Highlight pre-project rows with amber background
        didParseCell: function(data) {
          if (data.section === 'body' && data.row.raw[4] === 'PRE-PROJECT') {
            data.cell.styles.fillColor = [254, 243, 199]; // amber-100
            data.cell.styles.textColor = [146, 64, 14]; // amber-800
          }
        }
      });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      const pendingCount = allFilteredTasks.filter(t => t.status !== 'Completed').length;
      const completedCount = allFilteredTasks.filter(t => t.status === 'Completed').length;
      const preProjectCount = allFilteredTasks.filter(t => t.isPreProject).length;
      
      doc.text(`Total Tasks: ${allFilteredTasks.length} | Pending: ${pendingCount} | Completed: ${completedCount}${preProjectCount > 0 ? ` | Pre-Project: ${preProjectCount}` : ''}`, 15, finalY);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, finalY + 5);
      
      doc.save(`WorkPlan_${filterDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
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
    <div className="space-y-6" data-testid="planning-execution-page">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ongoing Projects</p>
              <p className="text-2xl font-bold text-slate-900">{stats.ongoingProjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed Projects</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.completedProjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <Calendar size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Today's Tasks</p>
              <p className="text-2xl font-bold text-amber-600">{stats.todayTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded-lg">
              <ClipboardList size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Tasks</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('workplan')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'workplan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="view-workplan-btn"
            >
              <span className="flex items-center gap-2"><FileText size={16} /> Work Plan</span>
            </button>
            <button
              onClick={() => setActiveView('projects')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="view-projects-btn"
            >
              <span className="flex items-center gap-2"><Package size={16} /> Projects</span>
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          {/* Search */}
          <div className="flex items-center gap-2">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-input"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {activeView === 'workplan' && (
            <>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                <DatePicker
                  value={filterDate}
                  onChange={(val) => setFilterDate(val)}
                  data-testid="filter-date"
                  placeholder="Filter date"
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <User size={18} className="text-slate-400" />
                <select
                  value={filterEngineer}
                  onChange={(e) => setFilterEngineer(e.target.value)}
                  data-testid="filter-engineer"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">All Members</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            onClick={loadData}
            data-testid="refresh-btn"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
          </button>

          {activeView === 'workplan' && (
            <div className="flex items-center gap-2 ml-auto">
              {/* Add Pre-Project Task Button */}
              <button
                onClick={() => {
                  resetNewTask();
                  setNewTask(prev => ({ ...prev, is_pre_project: true, task_type: 'Pre-Site Visit' }));
                  setSelectedProjectForTask(null);
                  setShowAddTaskModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors"
                data-testid="add-pre-project-task-btn"
              >
                <Plus size={16} />
                Add Pre-Project Task
              </button>
              <button
                onClick={downloadPDF}
                disabled={generatingPDF || allFilteredTasks.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="download-pdf-btn"
              >
                {generatingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download PDF
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                data-testid="print-btn"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Work Plan View - Using Inline for Print Styles */}
      {activeView === 'workplan' && (
        <div className="space-y-4 print:space-y-2" id="work-plan-printable">
          <div className="bg-slate-900 text-white rounded-xl p-4 print:bg-white print:text-black print:border print:border-black">
            <h2 className="text-xl font-bold text-center">Work Plan - {formatDateHeader(filterDate)}</h2>
            {filteredPreProjectTasks.length > 0 && (
              <p className="text-center text-sm mt-1 text-amber-300">
                {filteredPreProjectTasks.length} pre-project task{filteredPreProjectTasks.length !== 1 ? 's' : ''} included
              </p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-black">
            <table className="w-full">
              <thead className="bg-slate-100 print:bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-b border-slate-200 w-12">S/No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-b border-slate-200">Employee Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-b border-slate-200">Site & Location</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-b border-slate-200">Work</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-b border-slate-200 print:hidden">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase border-b border-slate-200 w-20 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allFilteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                      <Calendar size={40} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-medium">No tasks scheduled for this date</p>
                      <p className="text-sm mt-1">Select a project and add tasks from the Projects view</p>
                    </td>
                  </tr>
                ) : (
                  allFilteredTasks.map((task, idx) => (
                    <tr key={task.id} className={`hover:bg-slate-50 ${task.status === 'Completed' ? 'bg-emerald-50/50' : ''} ${task.isPreProject ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${task.isPreProject ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            {task.assigned_to?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{task.assigned_to || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {task.isPreProject ? (
                          <>
                            <p className="text-sm font-medium text-amber-700 flex items-center gap-1">
                              <Building2 size={14} />
                              {task.customer_name}
                            </p>
                            <p className="text-xs text-slate-500">{task.site_location}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-700">{task.site_location || task.project_location}</p>
                            <p className="text-xs text-slate-500">{task.project_client}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.isPreProject && (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded mr-2">
                            {task.task_type || 'Pre-Project'}
                          </span>
                        )}
                        <p className={`text-sm inline ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.description}
                        </p>
                        {!task.isPreProject && (
                          <p className="text-xs text-blue-600 mt-0.5">{task.project_pid}</p>
                        )}
                        {task.isPreProject && task.customer_contact && (
                          <p className="text-xs text-slate-500 mt-0.5">{task.customer_contact}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        <button
                          onClick={() => task.isPreProject ? togglePreProjectTaskStatus(task.id) : toggleTaskStatus(task.project_id, task.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {task.status === 'Completed' ? <CheckCircle size={12} /> : <Circle size={12} />}
                          {task.status}
                        </button>
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (task.isPreProject) {
                                handleEditPreProjectTask(task);
                              } else {
                                const project = projects.find(p => p.id === task.project_id);
                                handleEditTask(project, task);
                              }
                            }}
                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => task.isPreProject ? deletePreProjectTask(task.id) : deleteTask(task.project_id, task.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Task"
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

          {allFilteredTasks.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 print:hidden">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  <strong>{allFilteredTasks.length}</strong> tasks scheduled • 
                  <strong className="text-emerald-600 ml-2">{allFilteredTasks.filter(t => t.status === 'Completed').length}</strong> completed • 
                  <strong className="text-amber-600 ml-2">{allFilteredTasks.filter(t => t.status !== 'Completed').length}</strong> pending
                  {filteredPreProjectTasks.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{filteredPreProjectTasks.length} pre-project</span>
                  )}
                </span>
                <span className="text-slate-500">{Object.keys(tasksByMember).length} team members assigned</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects View - Using Sub-Component */}
      {activeView === 'projects' && (
        <ProjectsListView
          projects={projects}
          expandedProjects={expandedProjects}
          onToggleExpand={toggleProjectExpanded}
          onAddTask={openAddTaskModal}
          onEditTask={handleEditTask}
          onToggleTaskStatus={toggleTaskStatus}
          onDeleteTask={deleteTask}
          getStatusColor={getStatusColor}
          getPriorityColor={getPriorityColor}
          formatDateDisplay={formatDateDisplay}
          searchTerm={searchTerm}
        />
      )}

      {/* Add Task Modal - Using Sub-Component */}
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => { setShowAddTaskModal(false); setEditingTask(null); }}
        project={selectedProjectForTask}
        newTask={newTask}
        setNewTask={setNewTask}
        onSave={handleSaveTask}
        saving={savingTask}
        teamMembers={teamMembers}
        projects={projects}
        onProjectChange={setSelectedProjectForTask}
        editingTask={editingTask}
        customers={customers}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #work-plan-printable, #work-plan-printable * { visibility: visible; }
          #work-plan-printable { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default WorkSchedule;
