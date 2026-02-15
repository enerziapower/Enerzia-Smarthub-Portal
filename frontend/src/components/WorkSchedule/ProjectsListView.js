import React from 'react';
import { 
  ChevronDown, ChevronRight, Plus, CheckCircle, Circle, Trash2, Edit2,
  MapPin, User, Calendar, Package 
} from 'lucide-react';

const ProjectsListView = ({ 
  projects, 
  expandedProjects, 
  onToggleExpand, 
  onAddTask,
  onEditTask,
  onToggleTaskStatus,
  onDeleteTask,
  getStatusColor,
  getPriorityColor,
  formatDateDisplay,
  searchTerm
}) => {
  // Filter projects by search
  const filteredProjects = projects.filter(project => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      project.pid_no?.toLowerCase().includes(search) ||
      project.project_name?.toLowerCase().includes(search) ||
      project.client?.toLowerCase().includes(search) ||
      project.location?.toLowerCase().includes(search)
    );
  });

  const ongoingProjects = filteredProjects.filter(p => p.status !== 'Completed');
  const completedProjects = filteredProjects.filter(p => p.status === 'Completed');

  const renderProjectCard = (project, isCompleted = false) => {
    const isExpanded = expandedProjects[project.id];
    const taskCount = project.scheduled_tasks?.length || 0;
    const pendingTasks = (project.scheduled_tasks || []).filter(t => t.status !== 'Completed').length;

    return (
      <div 
        key={project.id} 
        className={`bg-white rounded-lg border ${isCompleted ? 'border-slate-200 opacity-75' : 'border-slate-200'} overflow-hidden`}
        data-testid={`project-card-${project.id}`}
      >
        {/* Project Header */}
        <div 
          className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'border-b border-slate-100' : ''}`}
          onClick={() => onToggleExpand(project.id)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button className="flex-shrink-0 text-slate-400">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{project.pid_no}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 truncate">{project.project_name}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>{project.client}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {project.location}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            {taskCount > 0 && (
              <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {pendingTasks}/{taskCount} tasks
              </div>
            )}
            {!isCompleted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask(project);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors"
                data-testid={`add-task-btn-${project.id}`}
              >
                <Plus size={14} />
                Add Task
              </button>
            )}
          </div>
        </div>

        {/* Expanded Tasks */}
        {isExpanded && (
          <div className="px-4 py-3 bg-slate-50/50">
            {project.scheduled_tasks && project.scheduled_tasks.length > 0 ? (
              <div className="space-y-2">
                {project.scheduled_tasks.map((task, idx) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center gap-3 p-3 bg-white rounded-lg border ${task.status === 'Completed' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}
                    data-testid={`task-item-${task.id}`}
                  >
                    <button
                      onClick={() => onToggleTaskStatus(project.id, task.id)}
                      className={`flex-shrink-0 ${task.status === 'Completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      {task.status === 'Completed' ? <CheckCircle size={20} /> : <Circle size={20} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.status === 'Completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                        {task.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User size={12} /> {task.assigned_to || 'Unassigned'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDateDisplay(task.scheduled_date)}
                        </span>
                        {task.site_location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {task.site_location}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onEditTask && onEditTask(project, task)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Task"
                        data-testid={`edit-task-${task.id}`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteTask(project.id, task.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Task"
                        data-testid={`delete-task-${task.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks scheduled for this project</p>
                {!isCompleted && (
                  <button
                    onClick={() => onAddTask(project)}
                    className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    + Add first task
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Ongoing Projects */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          Ongoing Projects ({ongoingProjects.length})
        </h3>
        <div className="space-y-3">
          {ongoingProjects.length > 0 ? (
            ongoingProjects.map(project => renderProjectCard(project))
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400">
              <p>No ongoing projects found</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-500" />
            Completed Projects ({completedProjects.length})
          </h3>
          <div className="space-y-3">
            {completedProjects.slice(0, 5).map(project => renderProjectCard(project, true))}
            {completedProjects.length > 5 && (
              <p className="text-sm text-slate-400 text-center">
                + {completedProjects.length - 5} more completed projects
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsListView;
