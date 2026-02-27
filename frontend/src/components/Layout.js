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
  Boxes, Factory, CircleDollarSign, Briefcase as BriefcaseIcon, MapPin, Link2,
  ArrowRightCircle, Shield
} from 'lucide-react';
import { settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Layout = () => {
  const { user, logout, hasModuleAccess, hasSubModuleAccess, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [orgSettings, setOrgSettings] = useState({ name: 'Smarthub Enerzia', logo_url: null });
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
  // Check if user has access to a department (legacy check - now superseded by permissions)
  const hasLegacyDepartmentAccess = (department) => {
    if (!user) return false;
    // Note: We no longer bypass for ceo_owner - permissions take precedence
    if (user.role === 'super_admin') return true;
    
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

  // Combined access check - permissions take precedence, then fall back to legacy department access
  const hasAccess = (department, moduleId) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    
    // If user has permissions set, use permission system
    if (user.permissions?.modules) {
      return hasModuleAccess(moduleId);
    }
    
    // Fall back to legacy department-based access
    return hasLegacyDepartmentAccess(department);
  };

  // Filter navigation items based on user permissions
  const filterNavByPermission = (navItems, moduleId) => {
    // Super admin sees everything
    if (isSuperAdmin) return navItems;
    
    // If user has no permissions set yet, show all items for backward compatibility
    if (!user?.permissions?.modules) return navItems;
    
    // If user doesn't have access to the module, return empty
    if (!hasModuleAccess(moduleId)) return [];
    
    // Filter sub-modules based on permissions
    return navItems.filter(item => {
      // Map nav items to sub-module IDs
      const subModuleId = getSubModuleIdFromPath(item.href, moduleId);
      if (!subModuleId) return true; // If no mapping, show by default
      return hasSubModuleAccess(subModuleId);
    });
  };

  // Map navigation paths to sub-module IDs
  const getSubModuleIdFromPath = (path, moduleId) => {
    const pathMappings = {
      // Company Hub
      '/company-hub': 'company_dashboard',
      '/domestic-customers': 'domestic_customers',
      '/overseas-customers': 'overseas_customers',
      '/vendors': 'vendors',
      '/team-members': 'team_members',
      '/company-hub/weekly-meetings': 'weekly_meetings',
      '/company-hub/payment-requests': 'payment_requests_company',
      // My Workspace
      '/employee/dashboard': 'my_dashboard',
      '/employee/attendance': 'my_attendance',
      '/employee/travel-log': 'travel_log',
      '/employee/overtime': 'overtime_requests',
      '/employee/leave': 'leave_management',
      '/employee/permission': 'permission_requests',
      '/employee/expenses': 'expense_claims',
      '/employee/transport': 'transport_requests',
      '/employee/journey': 'my_journey',
      '/employee/reports': 'my_reports',
      '/employee/profile': 'my_profile',
      // Projects Dept
      '/': 'projects_dashboard',
      '/projects/order-handoff': 'order_summary',
      '/projects': 'projects_services',
      '/projects/lifecycle': 'project_management',
      '/projects/weekly-billing': 'weekly_billing',
      '/projects/payment-requests': 'payment_requests_projects',
      '/projects/work-schedule': 'work_planner_projects',
      '/projects/amc-management': 'amc_management',
      '/projects/project-reports': 'project_reports',
      '/projects/calibration': 'calibration_services',
      '/projects/customer-service': 'service_reports',
      // Sales Dept
      '/sales': 'sales_dashboard',
      '/sales/customer-management': 'customer_management',
      '/sales/work-planner': 'work_planner_sales',
      '/sales/enquiries': 'enquiries',
      '/sales/quotations': 'quotations',
      '/sales/orders': 'orders',
      '/sales/order-lifecycle': 'order_management',
      '/sales/project-profit': 'project_profit',
      // Finance Dept
      '/finance': 'finance_dashboard',
      '/finance/work-planner': 'work_planner_finance',
      '/finance/budget': 'budget_management',
      '/finance/expense-approvals': 'expense_approvals',
      // HR Dept
      '/hr': 'hr_dashboard',
      '/hr/work-planner': 'work_planner_hr',
      '/hr/attendance-management': 'attendance_management',
      '/hr/travel-management': 'travel_management',
      '/hr/employees': 'employee_management',
      '/hr/payroll-dashboard': 'payroll_dashboard',
      '/hr/payroll': 'payroll_records',
      '/hr/statutory-reports': 'statutory_reports',
      '/hr/advances': 'advances_loans',
      '/hr/leave-dashboard': 'leave_dashboard',
      '/hr/overtime': 'overtime_management',
      '/hr/permission-approvals': 'permission_approvals',
      // Administration
      '/settings': 'org_settings',
      '/admin/users': 'user_management',
      '/admin/user-access': 'user_access_control',
      '/admin/announcements': 'announcements',
      '/admin/events': 'events_manager',
      '/admin/holidays': 'holiday_calendar',
      '/admin/pdf-templates': 'pdf_templates',
      '/settings/zoho': 'zoho_integration',
    };
    return pathMappings[path];
  };

  // Check if entire section should be shown based on permissions
  const shouldShowSection = (moduleId) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    
    // If user has permissions set, use permission system strictly
    if (user.permissions?.modules) {
      return hasModuleAccess(moduleId);
    }
    
    // Backward compatibility: if no permissions set, show all for users
    // This allows existing users to still work until admin sets their permissions
    return true;
  };

  // Check if user has access to ANY department (for showing Departments hub)
  const hasAnyDepartmentAccess = () => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    
    const deptModules = ['projects_dept', 'accounts_dept', 'sales_dept', 'purchase_dept', 
                         'exports_dept', 'finance_dept', 'hr_dept', 'operations_dept'];
    
    // If user has permissions set, check if any department module is enabled
    if (user.permissions?.modules) {
      return deptModules.some(moduleId => hasModuleAccess(moduleId));
    }
    
    // Backward compatibility: if no permissions set, show departments
    return true;
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
    { name: 'Order Summary', href: '/projects/order-handoff', icon: Package },
    { name: 'Projects & Services', href: '/projects', icon: FolderKanban },
    { name: 'Project Management', href: '/projects/lifecycle', icon: TrendingUp },
    { name: 'Weekly Billing', href: '/projects/weekly-billing', icon: DollarSign },
    { name: 'Payment Requests', href: '/projects/payment-requests', icon: CreditCard },
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
    { name: 'Payroll Dashboard', href: '/hr/payroll-dashboard', icon: DollarSign },
    { name: 'Payroll Records', href: '/hr/payroll', icon: FileBarChart },
    { name: 'Statutory Reports', href: '/hr/statutory-reports', icon: FileBarChart },
    { name: 'Advances & Loans', href: '/hr/advances', icon: CreditCard },
    { name: 'Leave Management', href: '/hr/leave-dashboard', icon: Calendar },
    { name: 'Overtime Management', href: '/hr/overtime', icon: Clock },
    { name: 'Permission Approvals', href: '/hr/permission-approvals', icon: CheckSquare },
    { name: 'Dept. Requirements', href: '/hr/dept-requirements', icon: ClipboardList },
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
    { name: 'User Access Control', href: '/admin/user-access', icon: Shield },
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
            {/* Always use the new Smarthub logo for sidebar */}
            <img 
              src="/logo.png" 
              alt="Smarthub Enerzia" 
              className="w-10 h-10 object-contain rounded-lg bg-white p-1"
            />
            {(sidebarOpen || isMobile) && (
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">Smarthub</h1>
                <p className="text-teal-400 text-xs font-medium">Enerzia</p>
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
          {shouldShowSection('company_hub') && (
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
                {renderNavItems(filterNavByPermission(companyHubNavigation, 'company_hub'))}
                
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
          )}

          {/* ============ 2. EMPLOYEE HUB (My Workspace) ============ */}
          {shouldShowSection('my_workspace') && (
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
                {renderNavItems(filterNavByPermission(employeeHubNavigation, 'my_workspace'))}
              </div>
            )}
          </div>
          )}

          {/* ============ 3. DEPARTMENTS HUB ============ */}
          {hasAnyDepartmentAccess() && (
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
                {hasAccess('projects', 'projects_dept') && renderDepartmentSection('Projects', FolderKanban, filterNavByPermission(projectsNavigation, 'projects_dept'), 'projects', 'blue')}
                
                {/* Accounts */}
                {hasAccess('accounts', 'accounts_dept') && renderDepartmentSection('Accounts', Calculator, filterNavByPermission(accountsNavigation, 'accounts_dept'), 'accounts', 'emerald')}
                
                {/* Sales */}
                {hasAccess('sales', 'sales_dept') && renderDepartmentSection('Sales', TrendingUp, filterNavByPermission(salesNavigation, 'sales_dept'), 'sales', 'amber')}
                
                {/* Purchase */}
                {hasAccess('purchase', 'purchase_dept') && renderDepartmentSection('Purchase', Package, filterNavByPermission(purchaseNavigation, 'purchase_dept'), 'purchase', 'cyan')}
                
                {/* Exports */}
                {hasAccess('exports', 'exports_dept') && renderDepartmentSection('Exports', Ship, filterNavByPermission(exportsNavigation, 'exports_dept'), 'exports', 'indigo')}
                
                {/* Finance */}
                {hasAccess('finance', 'finance_dept') && renderDepartmentSection('Finance', CircleDollarSign, filterNavByPermission(financeNavigation, 'finance_dept'), 'finance', 'purple')}
                
                {/* HR */}
                {hasAccess('hr', 'hr_dept') && renderDepartmentSection('HR & Admin', Users, filterNavByPermission(hrNavigation, 'hr_dept'), 'hr', 'rose')}
                
                {/* Operations */}
                {hasAccess('operations', 'operations_dept') && renderDepartmentSection('Operations', Wrench, filterNavByPermission(operationsNavigation, 'operations_dept'), 'operations', 'orange')}
              </div>
            )}
          </div>

          {/* ============ 4. MANAGEMENT HUB ============ */}
          {shouldShowSection('management_hub') && (
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
                  {renderNavItems(filterNavByPermission(managementHubNavigation, 'management_hub'))}
                </div>
              )}
            </div>
          )}

          {/* ============ 5. ADMINISTRATION HUB ============ */}
          {shouldShowSection('administration') && (
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
                  {renderNavItems(filterNavByPermission(administrationNavigation, 'administration'))}
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
                {orgSettings.name || 'Smarthub Enerzia'}
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
