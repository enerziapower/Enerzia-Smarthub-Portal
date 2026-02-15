import React from 'react';
import { CheckCircle, Circle, User, MapPin, Trash2, Clock, Edit2, Building2 } from 'lucide-react';

const WorkPlanView = ({ 
  tasks, 
  preProjectTasks = [],  // NEW: Pre-project tasks
  filterDate, 
  filterEngineer, 
  searchTerm, 
  onToggleStatus, 
  onDeleteTask,
  onEditTask,
  onTogglePreProjectStatus,  // NEW: Handler for pre-project tasks
  onDeletePreProjectTask,    // NEW: Handler for pre-project tasks
  onEditPreProjectTask,      // NEW: Handler for pre-project tasks
  formatDateHeader,
  getPriorityColor,
  projects
}) => {
  // Filter regular tasks for the work plan view
  const filteredTasks = tasks.filter(task => {
    // Filter by date
    if (filterDate && task.scheduled_date !== filterDate) return false;
    
    // Filter by engineer
    if (filterEngineer && task.assigned_to !== filterEngineer) return false;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        task.description?.toLowerCase().includes(search) ||
        task.assigned_to?.toLowerCase().includes(search) ||
        task.site_location?.toLowerCase().includes(search) ||
        task.project_name?.toLowerCase().includes(search) ||
        task.project_pid?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    
    return true;
  });
  
  // Filter pre-project tasks
  const filteredPreProjectTasks = preProjectTasks.filter(task => {
    const taskDate = task.scheduled_date || task.due_date;
    if (filterDate && taskDate !== filterDate) return false;
    if (filterEngineer && task.assigned_to !== filterEngineer) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        task.title?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        task.assigned_to?.toLowerCase().includes(search) ||
        task.customer_name?.toLowerCase().includes(search) ||
        task.customer_site?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Combine and group all tasks by employee
  const tasksByEmployee = {};
  
  // Add regular tasks
  filteredTasks.forEach(task => {
    const employee = task.assigned_to || 'Unassigned';
    if (!tasksByEmployee[employee]) {
      tasksByEmployee[employee] = [];
    }
    tasksByEmployee[employee].push({ ...task, isPreProject: false });
  });
  
  // Add pre-project tasks
  filteredPreProjectTasks.forEach(task => {
    const employee = task.assigned_to || 'Unassigned';
    if (!tasksByEmployee[employee]) {
      tasksByEmployee[employee] = [];
    }
    tasksByEmployee[employee].push({ 
      ...task, 
      isPreProject: true,
      description: task.title || task.description,
      site_location: task.customer_site,
      scheduled_date: task.scheduled_date || task.due_date
    });
  });

  // Sort employees alphabetically
  const sortedEmployees = Object.keys(tasksByEmployee).sort();
  
  const totalTasks = filteredTasks.length + filteredPreProjectTasks.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock size={20} />
          Work Plan - {formatDateHeader(filterDate)}
        </h2>
        <p className="text-slate-300 text-sm mt-1">
          {totalTasks} task{totalTasks !== 1 ? 's' : ''} scheduled
          {filteredPreProjectTasks.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 rounded text-amber-200 text-xs">
              {filteredPreProjectTasks.length} pre-project
            </span>
          )}
          {filterEngineer && ` for ${filterEngineer}`}
        </p>
      </div>

      {/* Task Table */}
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="work-plan-table">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">S.No</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Site & Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Work</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.length > 0 ? (
              (() => {
                let counter = 0;
                return sortedEmployees.map((employee) => (
                  tasksByEmployee[employee].map((task) => {
                    counter++;
                    return (
                      <tr 
                        key={task.id} 
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          task.status === 'Completed' ? 'bg-emerald-50/30' : ''
                        } ${task.isPreProject ? 'bg-amber-50/50' : ''}`}
                        data-testid={`task-row-${task.id}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {counter}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              task.isPreProject ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {employee.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span className="text-sm font-medium text-slate-800">{employee}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {task.isPreProject ? (
                            <>
                              <div className="flex items-center gap-1 text-sm text-amber-700 font-medium">
                                <Building2 size={14} className="text-amber-500" />
                                {task.customer_name}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin size={12} />
                                {task.site_location || '-'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm text-slate-800 font-medium">{task.project_pid}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin size={12} />
                                {task.site_location || task.project_location || '-'}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            {task.isPreProject && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded mb-1 mr-1">
                                {task.task_type || 'Pre-Project'}
                              </span>
                            )}
                            <span className={`text-sm ${task.status === 'Completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {task.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.isPreProject && task.customer_contact && (
                              <span className="text-xs text-slate-400">{task.customer_contact}</span>
                            )}
                            {!task.isPreProject && (
                              <span className="text-xs text-slate-400">{task.project_client}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              if (task.isPreProject) {
                                onTogglePreProjectStatus && onTogglePreProjectStatus(task.id);
                              } else {
                                onToggleStatus(task.project_id, task.id);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              task.status === 'Completed' 
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                            data-testid={`toggle-status-${task.id}`}
                          >
                            {task.status === 'Completed' ? (
                              <><CheckCircle size={14} /> Done</>
                            ) : (
                              <><Circle size={14} /> Pending</>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (task.isPreProject) {
                                  onEditPreProjectTask && onEditPreProjectTask(task);
                                } else {
                                  const project = projects?.find(p => p.id === task.project_id);
                                  onEditTask && onEditTask(project, task);
                                }
                              }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit task"
                              data-testid={`edit-task-${task.id}`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (task.isPreProject) {
                                  onDeletePreProjectTask && onDeletePreProjectTask(task.id);
                                } else {
                                  onDeleteTask(task.project_id, task.id);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete task"
                              data-testid={`delete-task-${task.id}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ));
              })()
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center">
                  <div className="text-slate-400">
                    <Clock size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No tasks scheduled</p>
                    <p className="text-sm">Select a different date or add tasks from the Projects view</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkPlanView;
