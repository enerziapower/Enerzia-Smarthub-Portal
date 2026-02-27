import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Check, X, Search, ChevronDown, ChevronRight,
  Save, Copy, RefreshCw, AlertCircle, CheckCircle, User,
  Building2, Lock, Unlock, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

const UserAccessControl = () => {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({ modules: {}, sub_modules: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState({});
  const [filterRole, setFilterRole] = useState('all');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, modulesRes] = await Promise.all([
        api.get('/user-access/users-list'),
        api.get('/user-access/modules')
      ]);
      setUsers(usersRes.data.users || []);
      setModules(modulesRes.data.modules || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load user access data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    try {
      setSelectedUser(user);
      setHasChanges(false);
      
      if (user.role === 'super_admin') {
        // Super admin has all permissions
        const allModules = {};
        const allSubModules = {};
        Object.entries(modules).forEach(([moduleId, moduleData]) => {
          allModules[moduleId] = true;
          moduleData.sub_modules?.forEach(sub => {
            allSubModules[sub.id] = true;
          });
        });
        setUserPermissions({ modules: allModules, sub_modules: allSubModules });
      } else {
        const res = await api.get(`/user-access/user/${user.id}`);
        setUserPermissions(res.data.permissions || { modules: {}, sub_modules: {} });
      }
      
      // Expand all modules by default when user is selected
      const expanded = {};
      Object.keys(modules).forEach(key => {
        expanded[key] = true;
      });
      setExpandedModules(expanded);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      toast.error('Failed to load user permissions');
    }
  };

  const toggleModule = (moduleId, enabled) => {
    if (selectedUser?.role === 'super_admin') return;
    
    setHasChanges(true);
    setUserPermissions(prev => {
      const newModules = { ...prev.modules, [moduleId]: enabled };
      const newSubModules = { ...prev.sub_modules };
      
      // Also toggle all sub-modules
      const moduleData = modules[moduleId];
      moduleData?.sub_modules?.forEach(sub => {
        newSubModules[sub.id] = enabled;
      });
      
      return { modules: newModules, sub_modules: newSubModules };
    });
  };

  const toggleSubModule = (moduleId, subModuleId, enabled) => {
    if (selectedUser?.role === 'super_admin') return;
    
    setHasChanges(true);
    setUserPermissions(prev => {
      const newSubModules = { ...prev.sub_modules, [subModuleId]: enabled };
      
      // Check if all sub-modules of this module are enabled/disabled
      const moduleData = modules[moduleId];
      const allEnabled = moduleData?.sub_modules?.every(sub => 
        sub.id === subModuleId ? enabled : newSubModules[sub.id]
      );
      const noneEnabled = moduleData?.sub_modules?.every(sub => 
        sub.id === subModuleId ? !enabled : !newSubModules[sub.id]
      );
      
      const newModules = { ...prev.modules };
      if (allEnabled) {
        newModules[moduleId] = true;
      } else if (noneEnabled) {
        newModules[moduleId] = false;
      }
      
      return { modules: newModules, sub_modules: newSubModules };
    });
  };

  const savePermissions = async () => {
    if (!selectedUser || selectedUser.role === 'super_admin') return;
    
    try {
      setSaving(true);
      await api.put(`/user-access/user/${selectedUser.id}`, {
        user_id: selectedUser.id,
        modules: userPermissions.modules,
        sub_modules: userPermissions.sub_modules
      });
      toast.success('Permissions saved successfully');
      setHasChanges(false);
      fetchData(); // Refresh list to update counts
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const grantAllAccess = () => {
    if (selectedUser?.role === 'super_admin') return;
    
    setHasChanges(true);
    const allModules = {};
    const allSubModules = {};
    Object.entries(modules).forEach(([moduleId, moduleData]) => {
      allModules[moduleId] = true;
      moduleData.sub_modules?.forEach(sub => {
        allSubModules[sub.id] = true;
      });
    });
    setUserPermissions({ modules: allModules, sub_modules: allSubModules });
  };

  const revokeAllAccess = () => {
    if (selectedUser?.role === 'super_admin') return;
    
    setHasChanges(true);
    setUserPermissions({ modules: {}, sub_modules: {} });
  };

  const copyPermissions = async (targetUserId) => {
    if (!selectedUser) return;
    
    try {
      await api.post('/user-access/copy-permissions', null, {
        params: {
          source_user_id: selectedUser.id,
          target_user_ids: [targetUserId]
        }
      });
      toast.success('Permissions copied successfully');
      fetchData();
    } catch (error) {
      console.error('Error copying permissions:', error);
      toast.error('Failed to copy permissions');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getModuleStatus = (moduleId) => {
    const moduleData = modules[moduleId];
    if (!moduleData?.sub_modules?.length) return userPermissions.modules[moduleId] ? 'full' : 'none';
    
    const enabledCount = moduleData.sub_modules.filter(sub => userPermissions.sub_modules[sub.id]).length;
    if (enabledCount === 0) return 'none';
    if (enabledCount === moduleData.sub_modules.length) return 'full';
    return 'partial';
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'ceo_owner': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="user-access-control">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            User Access Control
          </h1>
          <p className="text-slate-500 mt-1">Manage individual user permissions for modules and features</p>
        </div>
        {selectedUser && hasChanges && (
          <button
            onClick={savePermissions}
            disabled={saving || selectedUser.role === 'super_admin'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-700 mb-3">Select User</h2>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="ceo_owner">CEO/Owner</option>
              </select>
            </div>
          </div>
          
          <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={`p-3 border-b border-slate-100 cursor-pointer transition-colors ${
                  selectedUser?.id === user.id 
                    ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {user.department && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {user.department}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {user.modules_count || 0}/{user.total_modules || 0} modules
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
          {selectedUser ? (
            <>
              {/* User Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{selectedUser.name}</h3>
                      <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {selectedUser.role !== 'super_admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={grantAllAccess}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        <Unlock className="w-4 h-4" />
                        Grant All
                      </button>
                      <button
                        onClick={revokeAllAccess}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <Lock className="w-4 h-4" />
                        Revoke All
                      </button>
                    </div>
                  )}
                </div>
                
                {selectedUser.role === 'super_admin' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    Super Admin has full access to all modules. Permissions cannot be modified.
                  </div>
                )}
              </div>

              {/* Modules List */}
              <div className="p-4 max-h-[calc(100vh-400px)] overflow-y-auto">
                <div className="space-y-3">
                  {Object.entries(modules).map(([moduleId, moduleData]) => {
                    const status = getModuleStatus(moduleId);
                    const isExpanded = expandedModules[moduleId];
                    
                    return (
                      <div key={moduleId} className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* Module Header */}
                        <div 
                          className={`flex items-center justify-between p-3 cursor-pointer ${
                            status === 'full' ? 'bg-green-50' : 
                            status === 'partial' ? 'bg-amber-50' : 'bg-slate-50'
                          }`}
                          onClick={() => setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                            <div>
                              <p className="font-medium text-slate-800">{moduleData.name}</p>
                              <p className="text-xs text-slate-500">{moduleData.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              status === 'full' ? 'bg-green-100 text-green-700' :
                              status === 'partial' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {status === 'full' ? 'Full Access' : 
                               status === 'partial' ? 'Partial' : 'No Access'}
                            </span>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModule(moduleId, status !== 'full');
                              }}
                              disabled={selectedUser.role === 'super_admin'}
                              className={`w-12 h-6 rounded-full transition-colors relative ${
                                status === 'full' ? 'bg-green-500' : 'bg-slate-300'
                              } ${selectedUser.role === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                status === 'full' ? 'right-0.5' : 'left-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Sub-modules */}
                        {isExpanded && moduleData.sub_modules?.length > 0 && (
                          <div className="border-t border-slate-200 bg-white">
                            {moduleData.sub_modules.map(sub => (
                              <div 
                                key={sub.id}
                                className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 last:border-0"
                              >
                                <div className="flex items-center gap-2 pl-6">
                                  {userPermissions.sub_modules[sub.id] ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <X className="w-4 h-4 text-slate-300" />
                                  )}
                                  <span className="text-sm text-slate-700">{sub.name}</span>
                                  <span className="text-xs text-slate-400">{sub.path}</span>
                                </div>
                                
                                <button
                                  onClick={() => toggleSubModule(moduleId, sub.id, !userPermissions.sub_modules[sub.id])}
                                  disabled={selectedUser.role === 'super_admin'}
                                  className={`w-10 h-5 rounded-full transition-colors relative ${
                                    userPermissions.sub_modules[sub.id] ? 'bg-green-500' : 'bg-slate-300'
                                  } ${selectedUser.role === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                    userPermissions.sub_modules[sub.id] ? 'right-0.5' : 'left-0.5'
                                  }`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
              <Shield className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a user to manage permissions</p>
              <p className="text-sm">Choose a user from the list to view and modify their access</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAccessControl;
