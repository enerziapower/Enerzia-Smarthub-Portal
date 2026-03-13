/**
 * Project Management - Business Hub Tab
 * 
 * Migrated from: Projects → Project Management (ProjectLifecycle.js)
 * Purpose: Project execution, progress tracking, resource management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Plus, Search, Filter, RefreshCw, Eye, Edit2, 
  CheckCircle, Clock, AlertTriangle, TrendingUp, Users, Calendar,
  DollarSign, Target, ArrowRight, BarChart3, Percent
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = window.location.origin;

const PROJECT_STATUS = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
};

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, budget: 0 });

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Calculate stats
        const active = data.filter(p => p.status === 'in_progress' || p.status === 'pending').length;
        const completed = data.filter(p => p.status === 'completed').length;
        const totalBudget = data.reduce((sum, p) => sum + (p.budget || 0), 0);
        setStats({ total: data.length, active, completed, budget: totalBudget });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.pid_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-slate-300';
  };

  return (
    <div className="space-y-6" data-testid="project-management">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Project Management</h2>
            <p className="text-sm text-slate-500">Track project execution and progress</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(PROJECT_STATUS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <button onClick={fetchProjects} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderKanban size={18} className="text-violet-600" />
            <span className="text-sm text-slate-600">Total Projects</span>
          </div>
          <p className="text-2xl font-bold text-violet-700">{stats.total}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-blue-600" />
            <span className="text-sm text-slate-600">Active</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.active}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm text-slate-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-600">Total Budget</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">₹{(stats.budget / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-violet-500" size={32} />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FolderKanban size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No projects found</h3>
          <p className="text-sm text-slate-500">Projects will appear here when created</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <div 
              key={project.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-violet-600 font-medium mb-1">{project.pid_no}</p>
                  <h3 className="font-semibold text-slate-800 line-clamp-1">{project.project_name}</h3>
                  <p className="text-sm text-slate-500">{project.client}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${PROJECT_STATUS[project.status]?.color || 'bg-slate-100'}`}>
                  {PROJECT_STATUS[project.status]?.label || project.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-slate-500">Budget</span>
                  <p className="font-semibold">₹{(project.budget || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Expenses</span>
                  <p className="font-semibold">₹{(project.actual_expenses || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium">{project.progress || 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getProgressColor(project.progress || 0)}`}
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
