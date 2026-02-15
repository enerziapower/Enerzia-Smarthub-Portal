import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Clock, CheckCircle, AlertTriangle, Package, Truck, TestTube,
  Users, DollarSign, Calendar, ChevronRight, Search, Filter, RefreshCw,
  Play, Pause, MoreVertical, Building2, TrendingUp, ArrowRight, Eye,
  FileText, ClipboardCheck, Target, Percent
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Project Phase Configuration
const PROJECT_PHASES = [
  { id: 'planning', label: 'Planning', icon: FileText, color: 'slate' },
  { id: 'material_procurement', label: 'Material Procurement', icon: Package, color: 'blue' },
  { id: 'delivery', label: 'Delivery', icon: Truck, color: 'cyan' },
  { id: 'execution', label: 'Execution', icon: Play, color: 'purple' },
  { id: 'testing', label: 'Testing', icon: TestTube, color: 'amber' },
  { id: 'handover', label: 'Handover', icon: ClipboardCheck, color: 'green' },
  { id: 'closed', label: 'Closed', icon: CheckCircle, color: 'emerald' }
];

const PHASE_COLORS = {
  planning: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  material_procurement: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  delivery: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  execution: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  testing: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  handover: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  closed: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' }
};

const ProjectLifecycle = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const response = await fetch(`${API_URL}/api/projects`, { headers });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate dashboard stats
  const calculateStats = (projectList) => {
    const total = projectList.length;
    const byPhase = {};
    let totalBudget = 0;
    let totalActual = 0;
    let totalPOAmount = 0;
    let totalInvoiced = 0;
    let linkedOrders = 0;

    PROJECT_PHASES.forEach(p => { byPhase[p.id] = { count: 0, value: 0 }; });

    projectList.forEach(p => {
      // Map status to phase (for legacy projects without explicit phase)
      const phase = mapStatusToPhase(p.status);
      if (byPhase[phase]) {
        byPhase[phase].count++;
        byPhase[phase].value += p.po_amount || 0;
      }
      totalBudget += p.budget || 0;
      totalActual += p.actual_expenses || 0;
      totalPOAmount += p.po_amount || 0;
      totalInvoiced += p.invoiced_amount || 0;
      if (p.linked_order_id) linkedOrders++;
    });

    setStats({
      total,
      byPhase,
      totalBudget,
      totalActual,
      totalSavings: totalBudget - totalActual,
      totalPOAmount,
      totalInvoiced,
      totalPending: totalPOAmount - totalInvoiced,
      linkedOrders,
      avgCompletion: total > 0 ? Math.round(projectList.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / total) : 0
    });
  };

  // Map existing status to lifecycle phase
  const mapStatusToPhase = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('need') || statusLower.includes('planning') || statusLower.includes('start')) return 'planning';
    if (statusLower.includes('material') || statusLower.includes('procurement') || statusLower.includes('po')) return 'material_procurement';
    if (statusLower.includes('deliver') || statusLower.includes('transit')) return 'delivery';
    if (statusLower.includes('progress') || statusLower.includes('execution') || statusLower.includes('work')) return 'execution';
    if (statusLower.includes('test') || statusLower.includes('commissioning')) return 'testing';
    if (statusLower.includes('handover') || statusLower.includes('complete')) return 'handover';
    if (statusLower.includes('closed') || statusLower.includes('finished')) return 'closed';
    return 'execution'; // Default
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompact = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return formatCurrency(amount);
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = !searchTerm || 
      p.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPhase = !phaseFilter || mapStatusToPhase(p.status) === phaseFilter;
    
    return matchesSearch && matchesPhase;
  });

  // Update project phase
  const updateProjectPhase = async (projectId, newPhase) => {
    try {
      const headers = { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      };
      
      // Map phase back to status for now
      const phaseLabel = PROJECT_PHASES.find(p => p.id === newPhase)?.label || newPhase;
      
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: phaseLabel })
      });
      
      if (response.ok) {
        toast.success(`Project moved to ${phaseLabel}`);
        fetchProjects();
      } else {
        toast.error('Failed to update project phase');
      }
    } catch (error) {
      console.error('Error updating phase:', error);
      toast.error('Failed to update project phase');
    }
  };

  // Dashboard Tab
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-500">Total Projects</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
          <p className="text-xs text-slate-500 mt-1">{stats?.linkedOrders || 0} linked to orders</p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-slate-500">Total PO Value</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCompact(stats?.totalPOAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">Invoiced: {formatCompact(stats?.totalInvoiced)}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-slate-500">Budget Health</span>
          </div>
          <p className={`text-2xl font-bold ${(stats?.totalSavings || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCompact(stats?.totalSavings)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {(stats?.totalSavings || 0) >= 0 ? 'Under budget' : 'Over budget'}
          </p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-slate-500">Avg Completion</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.avgCompletion || 0}%</p>
        </div>
      </div>

      {/* Phase Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Projects by Phase</h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {PROJECT_PHASES.map((phase) => {
            const Icon = phase.icon;
            const count = stats?.byPhase?.[phase.id]?.count || 0;
            const value = stats?.byPhase?.[phase.id]?.value || 0;
            const colors = PHASE_COLORS[phase.id];
            
            return (
              <button
                key={phase.id}
                onClick={() => {
                  setPhaseFilter(phase.id);
                  setActiveTab('projects');
                }}
                className={`p-4 rounded-xl border ${colors.border} ${colors.bg} hover:opacity-80 transition-opacity text-left`}
              >
                <Icon className={`w-5 h-5 ${colors.text} mb-2`} />
                <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                <p className="text-xs text-slate-600 truncate">{phase.label}</p>
                <p className="text-xs text-slate-500 mt-1">{formatCompact(value)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects Pipeline View */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Project Pipeline</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {PROJECT_PHASES.slice(0, -1).map((phase, idx) => {
              const phaseProjects = filteredProjects.filter(p => mapStatusToPhase(p.status) === phase.id);
              const colors = PHASE_COLORS[phase.id];
              const Icon = phase.icon;
              
              return (
                <React.Fragment key={phase.id}>
                  <div className={`w-64 flex-shrink-0 rounded-xl border ${colors.border} ${colors.bg} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                      <span className={`font-medium ${colors.text}`}>{phase.label}</span>
                      <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {phaseProjects.length}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {phaseProjects.slice(0, 5).map(p => (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setSelectedProject(p);
                            setShowDetailsModal(true);
                          }}
                          className="bg-white rounded-lg p-3 border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <p className="font-medium text-slate-900 text-sm">{p.pid_no}</p>
                          <p className="text-xs text-slate-500 truncate">{p.client}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-slate-600">{p.completion_percentage || 0}%</span>
                            <span className="text-xs font-medium">{formatCompact(p.po_amount)}</span>
                          </div>
                        </div>
                      ))}
                      {phaseProjects.length > 5 && (
                        <p className="text-xs text-center text-slate-500 py-2">
                          +{phaseProjects.length - 5} more
                        </p>
                      )}
                      {phaseProjects.length === 0 && (
                        <p className="text-xs text-center text-slate-400 py-4">No projects</p>
                      )}
                    </div>
                  </div>
                  {idx < PROJECT_PHASES.length - 2 && (
                    <div className="flex items-center">
                      <ChevronRight className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Projects List Tab
  const ProjectsListTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg"
          />
        </div>
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">All Phases</option>
          {PROJECT_PHASES.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">PID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client / Project</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Phase</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">PO Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Budget</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actual</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Progress</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Linked Order</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                  No projects found
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => {
                const phase = mapStatusToPhase(project.status);
                const phaseConfig = PROJECT_PHASES.find(p => p.id === phase);
                const colors = PHASE_COLORS[phase];
                const savings = (project.budget || 0) - (project.actual_expenses || 0);
                
                return (
                  <tr key={project.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{project.pid_no}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{project.client}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{project.project_name}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                        {phaseConfig?.label || project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(project.po_amount)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(project.budget)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(project.actual_expenses)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full max-w-[100px] mx-auto">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${project.completion_percentage || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-slate-500 mt-1">{project.completion_percentage || 0}%</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {project.linked_order_no ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {project.linked_order_no}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowDetailsModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="project-lifecycle-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Management</h1>
          <p className="text-slate-500 mt-1">Track project phases from planning to handover</p>
        </div>
        <button
          onClick={fetchProjects}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'projects', label: `All Projects (${projects.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'projects' && <ProjectsListTab />}
        </>
      )}

      {/* Project Details Modal */}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedProject.pid_no}</h3>
                <p className="text-sm text-slate-500">{selectedProject.client}</p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Phase Progress */}
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Project Phase</h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {PROJECT_PHASES.map((phase, idx) => {
                    const currentPhase = mapStatusToPhase(selectedProject.status);
                    const currentIdx = PROJECT_PHASES.findIndex(p => p.id === currentPhase);
                    const isActive = phase.id === currentPhase;
                    const isCompleted = idx < currentIdx;
                    const Icon = phase.icon;
                    
                    return (
                      <React.Fragment key={phase.id}>
                        <button
                          onClick={() => updateProjectPhase(selectedProject.id, phase.id)}
                          className={`flex flex-col items-center p-3 rounded-lg min-w-[80px] transition-all ${
                            isActive ? 'bg-purple-100 border-2 border-purple-500' :
                            isCompleted ? 'bg-green-50 border border-green-300' :
                            'bg-slate-50 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-1 ${
                            isActive ? 'text-purple-600' :
                            isCompleted ? 'text-green-600' :
                            'text-slate-400'
                          }`} />
                          <span className={`text-xs text-center ${
                            isActive ? 'text-purple-700 font-medium' :
                            isCompleted ? 'text-green-700' :
                            'text-slate-500'
                          }`}>
                            {phase.label}
                          </span>
                        </button>
                        {idx < PROJECT_PHASES.length - 1 && (
                          <ArrowRight className={`w-4 h-4 flex-shrink-0 ${
                            isCompleted ? 'text-green-400' : 'text-slate-300'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">PO Amount</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(selectedProject.po_amount)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600">Budget</p>
                  <p className="text-lg font-bold text-purple-900">{formatCurrency(selectedProject.budget)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600">Actual Expenses</p>
                  <p className="text-lg font-bold text-amber-900">{formatCurrency(selectedProject.actual_expenses)}</p>
                </div>
                <div className={`p-3 rounded-lg ${(selectedProject.budget - selectedProject.actual_expenses) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-xs ${(selectedProject.budget - selectedProject.actual_expenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(selectedProject.budget - selectedProject.actual_expenses) >= 0 ? 'Savings' : 'Overrun'}
                  </p>
                  <p className={`text-lg font-bold ${(selectedProject.budget - selectedProject.actual_expenses) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(Math.abs(selectedProject.budget - selectedProject.actual_expenses))}
                  </p>
                </div>
              </div>

              {/* Progress & Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Progress</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completion</span>
                      <span className="font-medium">{selectedProject.completion_percentage || 0}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${selectedProject.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-3">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Engineer</span>
                      <span>{selectedProject.engineer_in_charge || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location</span>
                      <span className="truncate max-w-[150px]">{selectedProject.location || '-'}</span>
                    </div>
                    {selectedProject.linked_order_no && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Linked Order</span>
                        <span className="text-blue-600 font-medium">{selectedProject.linked_order_no}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Work Items */}
              {selectedProject.work_items?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Work Items ({selectedProject.work_items.length})</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Qty</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedProject.work_items.slice(0, 10).map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{item.description || '-'}</td>
                            <td className="px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectLifecycle;
