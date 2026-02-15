import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, ClipboardCheck, ChevronRight, Award, GanttChart
} from 'lucide-react';

// Sub-menu items for Project Reports
const PROJECT_REPORTS_MENU = [
  {
    id: 'equipment-test-reports',
    name: 'Equipment Test Reports',
    description: 'Test reports for electrical equipment',
    icon: Zap,
    href: '/projects/project-reports/equipment',
    color: 'bg-amber-500'
  },
  {
    id: 'audit-reports',
    name: 'Audit Reports',
    description: 'Electrical safety audit reports',
    icon: ClipboardCheck,
    href: '/projects/project-reports/audit',
    color: 'bg-green-500'
  },
  {
    id: 'work-completion',
    name: 'Work Completion Certificates',
    description: 'Project completion certificates',
    icon: Award,
    href: '/projects/project-reports/work-completion',
    color: 'bg-emerald-500'
  },
  {
    id: 'project-schedule',
    name: 'Project Schedule',
    description: 'Gantt chart schedules for projects',
    icon: GanttChart,
    href: '/projects/project-reports/schedule',
    color: 'bg-indigo-500'
  }
];

const ProjectReports = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Project Reports</h1>
          <p className="text-slate-500 mt-1">Create and manage project reports across different categories</p>
        </div>
      </div>

      {/* Report Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PROJECT_REPORTS_MENU.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.href}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className={`${item.color} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectReports;
export { PROJECT_REPORTS_MENU };
