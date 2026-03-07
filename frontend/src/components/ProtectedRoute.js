import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Map routes to required module permissions
const routePermissions = {
  // Management Hub routes
  '/ceo/approvals': 'management_hub',
  '/company-hub/reports': 'management_hub',
  // Administration routes
  '/settings': 'administration',
  '/admin/users': 'administration',
  '/admin/user-access': 'administration',
  '/admin/announcements': 'administration',
  '/admin/events': 'administration',
  '/admin/holidays': 'administration',
  '/admin/pdf-templates': 'administration',
  '/settings/zoho': 'administration',
  // Company Hub routes
  '/company-hub': 'company_hub',
  '/domestic-customers': 'company_hub',
  '/overseas-customers': 'company_hub',
  '/vendors': 'company_hub',
  '/team-members': 'company_hub',
  '/company-hub/weekly-meetings': 'company_hub',
  '/company-hub/payment-requests': 'company_hub',
  // Projects Department routes
  '/projects': 'projects_dept',
  '/projects/order-handoff': 'projects_dept',
  '/projects/lifecycle': 'projects_dept',
  '/projects/weekly-billing': 'projects_dept',
  '/projects/payment-requests': 'projects_dept',
  '/projects/work-schedule': 'projects_dept',
  '/projects/amc-management': 'projects_dept',
  '/projects/project-reports': 'projects_dept',
  '/projects/calibration': 'projects_dept',
  '/projects/customer-service': 'projects_dept',
  // Sales Department routes
  '/sales': 'sales_dept',
  '/sales/customer-management': 'sales_dept',
  '/sales/work-planner': 'sales_dept',
  '/sales/enquiries': 'sales_dept',
  '/sales/quotations': 'sales_dept',
  '/sales/orders': 'sales_dept',
  '/sales/order-lifecycle': 'sales_dept',
  '/sales/project-profit': 'sales_dept',
  '/sales/lead-management': 'sales_dept',
  // Finance Department routes
  '/finance': 'finance_dept',
  '/finance/work-planner': 'finance_dept',
  '/finance/budget': 'finance_dept',
  '/finance/expense-approvals': 'finance_dept',
  // HR Department routes
  '/hr': 'hr_dept',
  '/hr/work-planner': 'hr_dept',
  '/hr/attendance-management': 'hr_dept',
  '/hr/travel-management': 'hr_dept',
  '/hr/employees': 'hr_dept',
  '/hr/payroll-dashboard': 'hr_dept',
  '/hr/payroll': 'hr_dept',
  '/hr/statutory-reports': 'hr_dept',
  '/hr/advances': 'hr_dept',
  '/hr/leave-dashboard': 'hr_dept',
  '/hr/overtime': 'hr_dept',
  '/hr/permission-approvals': 'hr_dept',
  // Accounts Department routes
  '/accounts': 'accounts_dept',
  '/accounts/work-planner': 'accounts_dept',
  '/accounts/expense-management': 'accounts_dept',
  '/accounts/invoices': 'accounts_dept',
  '/accounts/retention': 'accounts_dept',
  '/accounts/payments': 'accounts_dept',
  '/accounts/tds': 'accounts_dept',
  '/accounts/billing': 'accounts_dept',
  // Purchase Department routes
  '/purchase': 'purchase_dept',
  '/purchase/work-planner': 'purchase_dept',
  '/purchase/procurement': 'purchase_dept',
  '/purchase/orders': 'purchase_dept',
  '/purchase/vendors': 'purchase_dept',
  '/purchase/inventory': 'purchase_dept',
  // Exports Department routes
  '/exports': 'exports_dept',
  '/exports/work-planner': 'exports_dept',
  '/exports/customers': 'exports_dept',
  '/exports/orders': 'exports_dept',
  '/exports/shipping': 'exports_dept',
  '/exports/customs': 'exports_dept',
  // Operations Department routes
  '/operations': 'operations_dept',
  '/operations/work-planner': 'operations_dept',
  '/operations/resources': 'operations_dept',
  '/operations/maintenance': 'operations_dept',
};

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading, needsSetup, hasModuleAccess, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If needs setup, redirect to setup page
  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admin has access to everything
  if (isSuperAdmin) {
    return children;
  }

  // Check route-level permissions
  const currentPath = location.pathname;
  
  // Find matching route permission
  let requiredModule = null;
  for (const [route, module] of Object.entries(routePermissions)) {
    if (currentPath === route || currentPath.startsWith(route + '/')) {
      requiredModule = module;
      break;
    }
  }

  // If route requires specific module permission
  if (requiredModule) {
    // Check if user has permissions set
    if (user?.permissions?.modules) {
      if (!hasModuleAccess(requiredModule)) {
        // Redirect to dashboard with no access message
        return <Navigate to="/employee/dashboard" replace state={{ accessDenied: true }} />;
      }
    } else {
      // No permissions set - only allow My Workspace routes
      if (!currentPath.startsWith('/employee')) {
        return <Navigate to="/employee/dashboard" replace state={{ accessDenied: true }} />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
