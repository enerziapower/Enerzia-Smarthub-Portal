import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Clock, DollarSign, Percent, 
  CheckSquare, Users, FileBarChart, Settings, Menu, X, 
  LogOut, User, CreditCard, Briefcase, FolderKanban, 
  ClipboardList, Award, ChevronDown, ChevronRight, Building2,
  TrendingUp, ShoppingCart, Target, Globe, Ship, Plane,
  PiggyBank, Calculator, UserCircle, BadgeCheck, Cog, Wrench,
  Package, Truck, FileCheck, Landmark, Receipt, Calendar,
  UsersRound, Store, LayoutGrid, Home, CalendarDays, Bell, Share2,
  Boxes, Factory, CircleDollarSign, Briefcase as BriefcaseIcon, MapPin, Link2
} from 'lucide-react';
import { settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [orgSettings, setOrgSettings] = useState({ name: 'Workhub Enerzia', logo_url: null });
  const [logoKey, setLogoKey] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    companyHub: false,
    customerHub: false,  // Sub-section inside Company Hub
    employeeHub: false,
    departmentsHub: false,
    managementHub: false,
    administrationHub: false,
    // Department sub-sections
    projects: false,
    accounts: false,
    sales: false,
    purchase: false,
    exports: false,
    finance: false,
    hr: false,
    operations: false
  });
  const location = useLocation();

  const fetchOrgSettings = useCallback(async () => {
    try {
      const res = await settingsAPI.getOrganization();
      setOrgSettings(res.data);
      setLogoKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching org settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchOrgSettings();
  }, [fetchOrgSettings]);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile, auto-open on desktop
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      } else if (!mobile && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.sidebar-container') && !e.target.closest('.mobile-menu-btn')) {
          setSidebarOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    if (showUserMenu) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.user-menu-container')) {
          setShowUserMenu(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  // Auto-expand the correct section based on current route
  useEffect(() => {
    const path = location.pathname;
    const newExpanded = { ...expandedSections };
    
    // Company Hub
    if (path.startsWith('/customer-hub') || path === '/domestic-customers' || 
        path === '/overseas-customers' || path.startsWith('/vendors') || 
        path.startsWith('/team-members') || path.startsWith('/company-hub') ||
        path === '/admin/shared-reports') {
      newExpanded.companyHub = true;
      
      // Customer Hub sub-section
      if (path.startsWith('/customer-hub') || path === '/admin/shared-reports') {
        newExpanded.customerHub = true;
      }
    }
    
    // Employee Hub
    if (path.startsWith('/employee')) {
      newExpanded.employeeHub = true;
    }
    
    // Departments Hub
    if (path === '/' || path.startsWith('/projects') || path.startsWith('/accounts') ||
        path.startsWith('/sales') || path.startsWith('/purchase') || path.startsWith('/exports') ||
        path.startsWith('/finance') || path.startsWith('/hr') || path.startsWith('/operations')) {
      newExpanded.departmentsHub = true;
      
      // Sub-department expansion
      if (path === '/' || path.startsWith('/projects')) newExpanded.projects = true;
      if (path.startsWith('/accounts')) newExpanded.accounts = true;
      if (path.startsWith('/sales')) newExpanded.sales = true;
      if (path.startsWith('/purchase')) newExpanded.purchase = true;
      if (path.startsWith('/exports')) newExpanded.exports = true;
      if (path.startsWith('/finance')) newExpanded.finance = true;
      if (path.startsWith('/hr')) newExpanded.hr = true;
      if (path.startsWith('/operations')) newExpanded.operations = true;
    }
    
    // Management Hub
    if (path.startsWith('/ceo') || path.startsWith('/reports') || path.startsWith('/billing')) {
      newExpanded.managementHub = true;
    }
    
    // Administration Hub (excluding shared-reports which is now in Customer Hub)
    if ((path.startsWith('/admin') && path !== '/admin/shared-reports') || path.startsWith('/settings')) {
      newExpanded.administrationHub = true;
    }
    
    setExpandedSections(newExpanded);
  }, [location.pathname]);

  // Check if user has access to a department
  const hasAccess = (department) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'ceo_owner') return true;
    
    // Case-insensitive comparison for department
    const userDept = (user.department || '').toLowerCase();
    const checkDept = department.toLowerCase();
    
    if (userDept === checkDept) return true;
    
    // Check can_view_departments array (case-insensitive)
    if (user.can_view_departments && Array.isArray(user.can_view_departments)) {
      const canView = user.can_view_departments.map(d => (d || '').toLowerCase());
      if (canView.includes(checkDept)) return true;
    }
    
    return false;
  };

  // ============ COMPANY HUB ============
  const companyHubNavigation = [
    { name: 'Dashboard', href: '/company-hub', icon: LayoutDashboard },
    { name: 'Domestic Customers', href: '/domestic-customers', icon: Users },
    { name: 'Overseas Customers', href: '/overseas-customers', icon: Globe },
    { name: 'Vendors', href: '/vendors', icon: Truck },
    { name: 'Team Members', href: '/team-members', icon: UsersRound },
    { name: 'Weekly Meetings', href: '/company-hub/weekly-meetings', icon: Calendar },
    { name: 'Payment Requests', href: '/company-hub/payment-requests', icon: CreditCard },
  ];

  // ============ CUSTOMER HUB (Sub-section of Company Hub) ============
  const customerHubNavigation = [
    { name: 'Customer Portal', href: '/customer-hub', icon: Store },
    { name: 'Shared Reports', href: '/admin/shared-reports', icon: Share2 },
  ];

  // ============ EMPLOYEE HUB (My Workspace) ============
  const employeeHubNavigation = [
    { name: 'My Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Attendance', href: '/employee/attendance', icon: Clock },
    { name: 'Travel Log', href: '/employee/travel-log', icon: MapPin },
    { name: 'Overtime Requests', href: '/employee/overtime', icon: Clock },
    { name: 'Leave Management', href: '/employee/leave', icon: Calendar },
    { name: 'Permission Requests', href: '/employee/permission', icon: CheckSquare },
    { name: 'Expense Claims', href: '/employee/expenses', icon: Receipt },
    { name: 'Transport Requests', href: '/employee/transport', icon: Truck },
    { name: 'My Journey', href: '/employee/journey', icon: Award },
    { name: 'My Reports', href: '/employee/reports', icon: FileBarChart },
    { name: 'My Profile', href: '/employee/profile', icon: UserCircle },
  ];

  // ============ DEPARTMENTS HUB ============
  // Projects Department
  const projectsNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects & Services', href: '/projects', icon: FolderKanban },
    { name: 'Project Management', href: '/projects/lifecycle', icon: TrendingUp },
    { name: 'Work Planner', href: '/projects/work-schedule', icon: Calendar },
    { name: 'AMC Management', href: '/projects/amc-management', icon: FileText },
    { name: 'Project Reports', href: '/projects/project-reports', icon: FileCheck },
    { name: 'Calibration Services', href: '/projects/calibration', icon: FileCheck },
    { name: 'Service Reports', href: '/projects/customer-service', icon: ClipboardList },
    { name: 'Dept. Requirements', href: '/projects/dept-requirements', icon: ClipboardList },
    { name: 'Reports', href: '/projects/reports', icon: FileBarChart },
  ];

  // Accounts Department
  const accountsNavigation = [
    { name: 'Dashboard', href: '/accounts', icon: LayoutDashboard },
    { name: 'Work Planner', href: '/accounts/work-planner', icon: Calendar },
    { name: 'Expense Management', href: '/accounts/expense-management', icon: Receipt },
    { name: 'Invoices', href: '/accounts/invoices', icon: FileText },
    { name: 'Retention', href: '/accounts/retention', icon: Clock },
    { name: 'Payments', href: '/accounts/payments', icon: CreditCard },
    { name: 'TDS', href: '/accounts/tds', icon: Percent },
    { name: 'Dept. Requirements', href: '/accounts/dept-requirements', icon: ClipboardList },
    { name: 'Billing', href: '/accounts/billing', icon: DollarSign },
    { name: 'Reports', href: '/accounts/reports', icon: FileBarChart },
  ];

  // Sales Department
  const salesNavigation = [
    { name: 'Dashboard', href: '/sales', icon: LayoutDashboard },
    { name: 'Customer Management', href: '/sales/customer-management', icon: Users },
    { name: 'Work Planner', href: '/sales/work-planner', icon: Calendar },
    { name: 'Enquiries', href: '/sales/enquiries', icon: FileText },
    { name: 'Quotations', href: '/sales/quotations', icon: FileCheck },
    { name: 'Orders', href: '/sales/orders', icon: ShoppingCart },
    { name: 'Order Management', href: '/sales/order-lifecycle', icon: TrendingUp },
    { name: 'Project Profit', href: '/sales/project-profit', icon: TrendingUp },
    { name: 'Dept. Requirements', href: '/sales/dept-requirements', icon: ClipboardList },
    { name: 'Reports', href: '/sales/reports', icon: FileBarChart },
  ];

  // Purchase Department
  const purchaseNavigation = [
    { name: 'Dashboard', href: '/purchase', icon: LayoutDashboard },
    { name: 'Work Planner', href: '/purchase/work-planner', icon: Calendar },
    { name: 'Procurement', href: '/purchase/procurement', icon: ShoppingCart },
    { name: 'Purchase Orders', href: '/purchase/orders', icon: FileCheck },
    { name: 'Vendors', href: '/purchase/vendors', icon: Truck },
    { name: 'Inventory', href: '/purchase/inventory', icon: Package },
    { name: 'Dept. Requirements', href: '/purchase/dept-requirements', icon: ClipboardList },
    { name: 'Reports', href: '/purchase/reports', icon: FileBarChart },
  ];

  // Exports Department
  const exportsNavigation = [
    { name: 'Dashboard', href: '/exports', icon: LayoutDashboard },
    { name: 'Work Planner', href: '/exports/work-planner', icon: Calendar },
    { name: 'Export Customers', href: '/exports/customers', icon: Users },
    { name: 'Export Orders', href: '/exports/orders', icon: Ship },
    { name: 'Shipping Docs', href: '/exports/shipping', icon: FileText },
    { name: 'Customs Clearance', href: '/exports/customs', icon: FileCheck },
    { name: 'Dept. Requirements', href: '/exports/dept-requirements', icon: ClipboardList },
    { name: 'Reports', href: '/exports/reports', icon: FileBarChart },
  ];

  // Finance Department
  const financeNavigation = [
    { name: 'Dashboard', href: '/finance', icon: LayoutDashboard },
    { name: 'Work Planner', href: '/finance/work-planner', icon: Calendar },
    { name: 'Budget Management', href: '/finance/budget', icon: Calculator },
    { name: 'Expense Approvals', href: '/finance/expense-approvals', icon: Receipt },
    { name: 'Dept. Requirements', href: '/finance/dept-requirements', icon: ClipboardList },
    { name: 'Reports', href: '/finance/reports', icon: FileBarChart },
  ];

  // HR Department
  const hrNavigation = [
    { name: 'Dashboard', href: '/hr', icon: LayoutDashboard },
    { name: 'Work Planner', href: '/hr/work-planner', icon: Calendar },
    { name: 'Attendance Management', href: '/hr/attendance-management', icon: Clock },
    { name: 'Travel Log Management', href: '/hr/travel-management', icon: MapPin },
    { name: 'Employee Management', href: '/hr/employees', icon: UserCircle },
    { name: 'Leave Approvals', href: '/hr/leave-approvals', icon: CheckSquare },
    { name: 'Permission Approvals', href: '/hr/permission-approvals', icon: CheckSquare },
    { name: 'Dept. Requirements', href: '/hr/dept-requirements', icon: ClipboardList },
    { name: 'Reports', href: '/hr/reports', icon: FileBarChart },
  ];

  // Operations Department
  const operationsNavigation = [
    { name: 'Dashboard', href: '/operations', icon: LayoutDashboard },
    { name: 'Work Planner', href: '/operations/work-planner', icon: Calendar },
    { name: 'Resource Planning', href: '/operations/resources', icon: Cog },
    { name: 'Maintenance Schedule', href: '/operations/maintenance', icon: Wrench },
    { name: 'Dept. Requirements', href: '/operations/dept-requirements', icon: ClipboardList },
    { name: 'Reports', href: '/operations/reports', icon: FileBarChart },
  ];

  // ============ MANAGEMENT HUB ============
  const managementHubNavigation = [
    { name: 'Payment Approvals', href: '/ceo/approvals', icon: CreditCard },
    { name: 'Reports Center', href: '/company-hub/reports', icon: FileBarChart },
  ];

  // ============ ADMINISTRATION HUB ============
  const administrationNavigation = [
    { name: 'Organization Settings', href: '/settings', icon: Settings },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Announcements', href: '/admin/announcements', icon: Bell },
    { name: 'Events Manager', href: '/admin/events', icon: Calendar },
    { name: 'Holiday Calendar', href: '/admin/holidays', icon: CalendarDays },
    { name: 'PDF Templates', href: '/admin/pdf-templates', icon: FileText },
    { name: 'Zoho Integration', href: '/settings/zoho', icon: Link2 },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname === path) return true;
    return false;
  };

  const isInSection = (section) => {
    if (section === 'projects') {
      return location.pathname === '/' || location.pathname.startsWith('/projects');
    }
    return location.pathname.startsWith(`/${section}`);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Render nav items
  const renderNavItems = (items, showIcons = true) => {
    return items.map((item) => (
      <Link
        key={item.href}
        to={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive(item.href)
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        onClick={handleMobileNavClick}
      >
        {showIcons && <item.icon className="w-4 h-4" />}
        {(sidebarOpen || isMobile) && <span>{item.name}</span>}
      </Link>
    ));
  };

  // Render expandable department section
  const renderDepartmentSection = (name, IconComponent, items, sectionKey, color = 'blue') => {
    const isExpanded = expandedSections[sectionKey];
    const isActiveSection = isInSection(sectionKey);
    
    const colorClasses = {
      blue: 'text-blue-400',
      emerald: 'text-emerald-400',
      purple: 'text-purple-400',
      amber: 'text-amber-400',
      rose: 'text-rose-400',
      cyan: 'text-cyan-400',
      orange: 'text-orange-400',
      indigo: 'text-indigo-400'
    };

    return (
      <div className="mb-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isActiveSection ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <IconComponent className={`w-4 h-4 ${colorClasses[color]}`} />
            {(sidebarOpen || isMobile) && <span>{name}</span>}
          </div>
          {(sidebarOpen || isMobile) && (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {isExpanded && (sidebarOpen || isMobile) && (
          <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
            {renderNavItems(items, true)}
          </div>
        )}
      </div>
    );
  };

  // Close sidebar after navigation on mobile
  const handleMobileNavClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-container ${
          isMobile 
            ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full')
            : (sidebarOpen ? 'w-64' : 'w-16')
        } ${isMobile ? 'w-72' : ''} bg-slate-900 min-h-screen flex flex-col transition-all duration-300 fixed left-0 top-0 bottom-0 z-40`}
        style={{ paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0' }}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {orgSettings.logo_url ? (
              <img 
                key={logoKey}
                src={orgSettings.logo_url} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-lg bg-white p-1"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <Boxes className="w-6 h-6 text-white" />
              </div>
            )}
            {(sidebarOpen || isMobile) && (
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">Workhub</h1>
                <p className="text-blue-400 text-xs font-medium">Enerzia</p>
              </div>
            )}
            {/* Mobile close button */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 ml-auto rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* ============ 1. COMPANY HUB ============ */}
          <div>
            <button
              onClick={() => toggleSection('companyHub')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                expandedSections.companyHub ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                {(sidebarOpen || isMobile) && <span className="font-semibold text-sm">Company Hub</span>}
              </div>
              {(sidebarOpen || isMobile) && (
                expandedSections.companyHub ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.companyHub && (sidebarOpen || isMobile) && (
              <div className="mt-2 space-y-1">
                {renderNavItems(companyHubNavigation)}
                
                {/* Customer Hub - Nested Sub-section */}
                <div className="mt-1">
                  <button
                    onClick={() => toggleSection('customerHub')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      expandedSections.customerHub ? 'bg-slate-800 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Store className="w-4 h-4 text-cyan-400" />
                      <span>Customer Hub</span>
                    </div>
                    {expandedSections.customerHub ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.customerHub && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
                      {renderNavItems(customerHubNavigation)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ============ 2. EMPLOYEE HUB (My Workspace) ============ */}
          <div>
            <button
              onClick={() => toggleSection('employeeHub')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                expandedSections.employeeHub ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCircle className="w-5 h-5" />
                {(sidebarOpen || isMobile) && <span className="font-semibold text-sm">My Workspace</span>}
              </div>
              {(sidebarOpen || isMobile) && (
                expandedSections.employeeHub ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.employeeHub && (sidebarOpen || isMobile) && (
              <div className="mt-2 space-y-1">
                {renderNavItems(employeeHubNavigation)}
              </div>
            )}
          </div>

          {/* ============ 3. DEPARTMENTS HUB ============ */}
          <div>
            <button
              onClick={() => toggleSection('departmentsHub')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                expandedSections.departmentsHub ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Factory className="w-5 h-5" />
                {(sidebarOpen || isMobile) && <span className="font-semibold text-sm">Departments</span>}
              </div>
              {(sidebarOpen || isMobile) && (
                expandedSections.departmentsHub ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {expandedSections.departmentsHub && (sidebarOpen || isMobile) && (
              <div className="mt-2 space-y-1 ml-2">
                {/* Projects */}
                {hasAccess('projects') && renderDepartmentSection('Projects', FolderKanban, projectsNavigation, 'projects', 'blue')}
                
                {/* Accounts */}
                {hasAccess('accounts') && renderDepartmentSection('Accounts', Calculator, accountsNavigation, 'accounts', 'emerald')}
                
                {/* Sales */}
                {hasAccess('sales') && renderDepartmentSection('Sales', TrendingUp, salesNavigation, 'sales', 'amber')}
                
                {/* Purchase */}
                {hasAccess('purchase') && renderDepartmentSection('Purchase', Package, purchaseNavigation, 'purchase', 'cyan')}
                
                {/* Exports */}
                {hasAccess('exports') && renderDepartmentSection('Exports', Ship, exportsNavigation, 'exports', 'indigo')}
                
                {/* Finance */}
                {hasAccess('finance') && renderDepartmentSection('Finance', CircleDollarSign, financeNavigation, 'finance', 'purple')}
                
                {/* HR */}
                {hasAccess('hr') && renderDepartmentSection('HR & Admin', Users, hrNavigation, 'hr', 'rose')}
                
                {/* Operations */}
                {hasAccess('operations') && renderDepartmentSection('Operations', Wrench, operationsNavigation, 'operations', 'orange')}
              </div>
            )}
          </div>

          {/* ============ 4. MANAGEMENT HUB ============ */}
          {(user?.role === 'super_admin' || user?.role === 'ceo' || user?.role === 'manager') && (
            <div>
              <button
                onClick={() => toggleSection('managementHub')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  expandedSections.managementHub ? 'bg-amber-600/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BriefcaseIcon className="w-5 h-5" />
                  {(sidebarOpen || isMobile) && <span className="font-semibold text-sm">Management</span>}
                </div>
                {(sidebarOpen || isMobile) && (
                  expandedSections.managementHub ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {expandedSections.managementHub && (sidebarOpen || isMobile) && (
                <div className="mt-2 space-y-1">
                  {renderNavItems(managementHubNavigation)}
                </div>
              )}
            </div>
          )}

          {/* ============ 5. ADMINISTRATION HUB ============ */}
          {(user?.role === 'super_admin' || user?.role === 'admin' || hasAccess('hr')) && (
            <div>
              <button
                onClick={() => toggleSection('administrationHub')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  expandedSections.administrationHub ? 'bg-rose-600/20 text-rose-400' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" />
                  {(sidebarOpen || isMobile) && <span className="font-semibold text-sm">Administration</span>}
                </div>
                {(sidebarOpen || isMobile) && (
                  expandedSections.administrationHub ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {expandedSections.administrationHub && (sidebarOpen || isMobile) && (
                <div className="mt-2 space-y-1">
                  {renderNavItems(administrationNavigation)}
                </div>
              )}
            </div>
          )}

        </nav>

        {/* Sidebar Toggle - Only show on desktop */}
        {!isMobile && (
          <div className="p-3 border-t border-slate-800">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-16')
      }`}>
        {/* Header - with safe area padding for mobile devices */}
        <header className="bg-white shadow-sm sticky top-0 z-20" style={{ paddingTop: isMobile ? 'max(env(safe-area-inset-top), 12px)' : '0' }}>
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="mobile-menu-btn p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Menu className="w-6 h-6 text-slate-600" />
                </button>
              )}
              <h2 className="text-base md:text-lg font-semibold text-slate-800 truncate">
                {orgSettings.name || 'Workhub Enerzia'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User Menu */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  {user && (
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-slate-700">{user.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role?.replace('_', ' ')}</p>
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-700">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <Link
                      to="/employee/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet context={{ refreshOrgSettings: fetchOrgSettings }} />
        </main>
      </div>
    </div>
  );
};

export default Layout;
