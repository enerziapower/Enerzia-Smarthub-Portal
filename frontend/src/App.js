import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Projects Department Pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import WorkSchedule from './pages/WorkSchedule';
import WorkCompletion from './pages/WorkCompletion';
import ProjectsTaskManager from './pages/projects/ProjectsTaskManager';
import CustomerService from './pages/projects/CustomerService';
import CustomerServiceHub from './pages/projects/CustomerServiceHub';
import DeptRequirements from './pages/projects/DeptRequirements';
import ProjectsPaymentRequests from './pages/projects/PaymentRequests';
import ProjectLifecycle from './pages/projects/ProjectLifecycle';
// Project Reports
import ProjectReports from './pages/projects/ProjectReports';
import EquipmentTestReports from './pages/projects/EquipmentTestReports';
import EquipmentReportsList from './pages/projects/EquipmentReportsList';
import CreateTestReport from './pages/projects/CreateTestReport';
import EquipmentServiceReport from './pages/projects/EquipmentServiceReport';
import AuditReports from './pages/projects/AuditReports';
import CreateAuditReport from './pages/projects/CreateAuditReport';
import ScheduledInspections from './pages/projects/ScheduledInspections';
import ProjectSchedule from './pages/projects/ProjectSchedule';
import TransformerTestReport from './pages/projects/TransformerTestReport';
import IRThermographyForm from './pages/projects/IRThermographyForm';
// AMC Module (Annual Maintenance Contracts)
import AMCList from './pages/projects/AMCList';
import AMCForm from './pages/projects/AMCForm';
import AMCManagement from './pages/projects/AMCManagement';
// Calibration Services Module
import CalibrationList from './pages/projects/CalibrationList';
import CalibrationForm from './pages/projects/CalibrationForm';

// Employee Hub Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeAttendance from './pages/employee/EmployeeAttendance';
import TravelLog from './pages/employee/TravelLog';
import LeaveManagement from './pages/employee/LeaveManagement';
import ExpenseClaims from './pages/employee/ExpenseClaims';
import MyJourney from './pages/employee/MyJourney';
import OvertimeRequests from './pages/employee/OvertimeRequests';
import PermissionRequests from './pages/employee/PermissionRequests';
import TransportRequests from './pages/employee/TransportRequests';
import MyProfile from './pages/employee/MyProfile';
import MyReports from './pages/employee/MyReports';

// Company Hub Pages
import CentralWeeklyMeetings from './pages/company-hub/CentralWeeklyMeetings';
import CentralPaymentRequests from './pages/company-hub/CentralPaymentRequests';

// Customer Hub Pages (Internal)
import CustomerDirectory from './pages/customer-hub/CustomerDirectory';
import CustomerProfile from './pages/customer-hub/CustomerProfile';

// Administration Pages
import AnnouncementsManager from './pages/admin/AnnouncementsManager';
import HolidayCalendar from './pages/admin/HolidayCalendar';
import EventsManager from './pages/admin/EventsManager';
import UserManagement from './pages/admin/UserManagement';
import PDFTemplateSettings from './pages/admin/PDFTemplateSettings';
import SharedReports from './pages/admin/SharedReports';

// Accounts Department Pages
import AccountsDashboard from './pages/AccountsDashboard';
import Invoices from './pages/Invoices';
import Retention from './pages/Retention';
import Payments from './pages/Payments';
import TDS from './pages/TDS';
import TaskManager from './pages/TaskManager';
import AccountsTaskManager from './pages/accounts/AccountsTaskManager';
import AccountsDeptRequirements from './pages/accounts/DeptRequirements';
import AccountsPaymentRequests from './pages/accounts/PaymentRequests';
import AccountsWorkPlanner from './pages/accounts/WorkPlanner';
import ExpenseManagement from './pages/accounts/ExpenseManagement';

// Sales Department Pages
import SalesDashboard from './pages/sales/SalesDashboard';
import Enquiries from './pages/sales/Enquiries';

import Quotations from './pages/sales/Quotations';
import Orders from './pages/sales/Orders';

import SalesTaskManager from './pages/sales/SalesTaskManager';
import SalesDeptRequirements from './pages/sales/DeptRequirements';
import SalesPaymentRequests from './pages/sales/PaymentRequests';
import SalesWorkPlanner from './pages/sales/WorkPlanner';
import ProjectProfitDashboard from './pages/sales/ProjectProfitDashboard';
import CustomerManagement from './pages/sales/CustomerManagement';
import OrderLifecycle from './pages/sales/OrderLifecycle';

// Purchase Department Pages
import PurchaseDashboard from './pages/purchase/PurchaseDashboard';
import PurchaseOrders from './pages/purchase/PurchaseOrders';
import PurchaseModule from './pages/purchase/PurchaseModule';
import Vendors from './pages/purchase/Vendors';
import Inventory from './pages/purchase/Inventory';
import PurchaseTaskManager from './pages/purchase/PurchaseTaskManager';
import PurchaseDeptRequirements from './pages/purchase/DeptRequirements';
import PurchasePaymentRequests from './pages/purchase/PaymentRequests';
import PurchaseWorkPlanner from './pages/purchase/WorkPlanner';

// Exports Department Pages
import ExportsDashboard from './pages/exports/ExportsDashboard';
import ExportOrders from './pages/exports/ExportOrders';
import ShippingDocuments from './pages/exports/ShippingDocuments';
import CustomsClearance from './pages/exports/CustomsClearance';
import ExportCustomers from './pages/exports/ExportCustomers';
import ExportsTaskManager from './pages/exports/ExportsTaskManager';
import ExportsDeptRequirements from './pages/exports/DeptRequirements';
import ExportsPaymentRequests from './pages/exports/PaymentRequests';
import ExportsWorkPlanner from './pages/exports/WorkPlanner';

// Finance Department Pages
import FinanceDashboard from './pages/finance/FinanceDashboard';
import BudgetManagement from './pages/finance/BudgetManagement';
import FinanceTaskManager from './pages/finance/FinanceTaskManager';
import FinanceDeptRequirements from './pages/finance/DeptRequirements';
import PaymentRequests from './pages/finance/PaymentRequests';
import FinanceWorkPlanner from './pages/finance/WorkPlanner';
import ExpenseApprovals from './pages/finance/ExpenseApprovals';

// CEO/Owner Pages
import CEOApprovals from './pages/ceo/CEOApprovals';

// HR & Admin Department Pages
import HRDashboard from './pages/hr/HRDashboard';
import EmployeeManagement from './pages/hr/EmployeeManagement';
import EmployeeManagementFull from './pages/hr/EmployeeManagementFull';
import PayrollProcessing from './pages/hr/PayrollProcessing';
import HRTaskManager from './pages/hr/HRTaskManager';
import HRDeptRequirements from './pages/hr/DeptRequirements';
import HRPaymentRequests from './pages/hr/PaymentRequests';
import HRWorkPlanner from './pages/hr/WorkPlanner';
import LeaveApprovals from './pages/hr/LeaveApprovals';
import PermissionApprovals from './pages/hr/PermissionApprovals';
import AttendanceManagement from './pages/hr/AttendanceManagement';
import TravelManagement from './pages/hr/TravelManagement';
import AdvancesLoans from './pages/hr/AdvancesLoans';
import LeaveDashboard from './pages/hr/LeaveDashboard';
import OvertimeManagement from './pages/hr/OvertimeManagement';

// Operations Department Pages
import OperationsDashboard from './pages/operations/OperationsDashboard';
import ResourcePlanning from './pages/operations/ResourcePlanning';
import MaintenanceSchedule from './pages/operations/MaintenanceSchedule';
import OperationsTaskManager from './pages/operations/OperationsTaskManager';
import OperationsPaymentRequests from './pages/operations/PaymentRequests';
import OperationsDeptRequirements from './pages/operations/DeptRequirements';
import OperationsWorkPlanner from './pages/operations/WorkPlanner';

// Shared Pages
import Home from './pages/Home';
import WeeklyMeeting from './pages/WeeklyMeeting';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ZohoIntegration from './pages/settings/ZohoIntegration';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

// Customer Portal Pages
import CustomerLogin from './pages/customer-portal/CustomerLogin';
import CustomerDashboard from './pages/customer-portal/CustomerDashboard';
import CustomerAMCs from './pages/customer-portal/CustomerAMCs';
import CustomerAMCDetail from './pages/customer-portal/CustomerAMCDetail';
import CustomerReports from './pages/customer-portal/CustomerReports';
import CustomerProjects from './pages/customer-portal/CustomerProjects';
import CustomerWCC from './pages/customer-portal/CustomerWCC';
import CustomerNotifications from './pages/customer-portal/CustomerNotifications';
import CustomerPortalProfile from './pages/customer-portal/CustomerProfile';
import CustomerFeedback from './pages/customer-portal/CustomerFeedback';
import CustomerSupport from './pages/customer-portal/CustomerSupport';
import CustomerDownloads from './pages/customer-portal/CustomerDownloads';

// Main Menu Pages (Company Overview, Customers, Vendors, Team Members)
import CompanyOverview from './pages/CompanyOverview';
import CustomersPage from './pages/Customers';
import DomesticCustomers from './pages/DomesticCustomers';
import OverseasCustomers from './pages/OverseasCustomers';
import VendorsPage from './pages/Vendors';
import TeamMembers from './pages/TeamMembers';

// Route guard for login page
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Customer Portal Routes (Separate from main app) */}
      <Route path="/customer-portal/login" element={<CustomerLogin />} />
      <Route path="/customer-portal/dashboard" element={<CustomerDashboard />} />
      <Route path="/customer-portal/projects" element={<CustomerProjects />} />
      <Route path="/customer-portal/projects/:projectId" element={<CustomerProjects />} />
      <Route path="/customer-portal/amcs" element={<CustomerAMCs />} />
      <Route path="/customer-portal/amcs/:amcId" element={<CustomerAMCDetail />} />
      <Route path="/customer-portal/wcc" element={<CustomerWCC />} />
      <Route path="/customer-portal/reports" element={<CustomerReports />} />
      <Route path="/customer-portal/notifications" element={<CustomerNotifications />} />
      <Route path="/customer-portal/profile" element={<CustomerPortalProfile />} />
      <Route path="/customer-portal/feedback" element={<CustomerFeedback />} />
      <Route path="/customer-portal/support" element={<CustomerSupport />} />
      <Route path="/customer-portal/support/:ticketId" element={<CustomerSupport />} />
      <Route path="/customer-portal/downloads" element={<CustomerDownloads />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        
        {/* Main Menu - Company Overview, Customers, Vendors, Team Members */}
        <Route path="company-overview" element={<CompanyOverview />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="domestic-customers" element={<DomesticCustomers />} />
        <Route path="overseas-customers" element={<OverseasCustomers />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="team-members" element={<TeamMembers />} />
        
        {/* Projects Department */}
        <Route path="projects">
          <Route index element={<Projects />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="lifecycle" element={<ProjectLifecycle />} />
          <Route path="work-schedule" element={<WorkSchedule />} />
          <Route path="work-completion" element={<WorkCompletion />} />
          <Route path="customer-service" element={<CustomerServiceHub />} />
          <Route path="customer-service/all" element={<CustomerService />} />
          <Route path="customer-service/category/:categoryId" element={<CustomerService />} />
          <Route path="payment-requests" element={<ProjectsPaymentRequests />} />
          <Route path="dept-requirements" element={<DeptRequirements />} />
          <Route path="task-manager" element={<ProjectsTaskManager />} />
          <Route path="billing" element={<Billing />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="reports" element={<Reports />} />
          {/* Project Reports - Main with sub-sections */}
          <Route path="project-reports" element={<ProjectReports />} />
          <Route path="project-reports/equipment" element={<EquipmentTestReports />} />
          <Route path="project-reports/equipment/:equipmentId" element={<EquipmentReportsList />} />
          <Route path="project-reports/equipment/:equipmentId/new" element={<CreateTestReport />} />
          <Route path="project-reports/equipment/:equipmentId/:reportId" element={<CreateTestReport />} />
          <Route path="project-reports/equipment/:equipmentId/:reportId/edit" element={<CreateTestReport />} />
          {/* Transformer Test Report - Dedicated Form */}
          <Route path="project-reports/equipment/transformer/new" element={<TransformerTestReport />} />
          <Route path="project-reports/equipment/transformer/:reportId/edit" element={<TransformerTestReport />} />
          {/* Equipment Service Reports - Template-based Forms */}
          <Route path="project-reports/service/:equipmentType/new" element={<EquipmentServiceReport />} />
          <Route path="project-reports/service/:equipmentType/:reportId/edit" element={<EquipmentServiceReport />} />
          <Route path="project-reports/audit" element={<AuditReports />} />
          <Route path="project-reports/audit/new" element={<CreateAuditReport />} />
          {/* IR Thermography Routes */}
          <Route path="project-reports/audit/ir-thermography/new" element={<IRThermographyForm />} />
          <Route path="project-reports/audit/ir-thermography/:reportId" element={<IRThermographyForm />} />
          <Route path="project-reports/audit/ir-thermography/:reportId/edit" element={<IRThermographyForm />} />
          <Route path="project-reports/scheduled" element={<ScheduledInspections />} />
          <Route path="project-reports/schedule" element={<ProjectSchedule />} />
          <Route path="project-reports/work-completion" element={<WorkCompletion />} />
          {/* AMC Management (Consolidated: Dashboard + Contracts + Service Calendar) */}
          <Route path="amc-management" element={<AMCManagement />} />
          <Route path="amc" element={<AMCList />} />
          <Route path="amc/new" element={<AMCForm />} />
          <Route path="amc/:amcId" element={<AMCForm />} />
          <Route path="amc/:amcId/edit" element={<AMCForm />} />
          {/* Calibration Services Module */}
          <Route path="calibration" element={<CalibrationList />} />
          <Route path="calibration/new" element={<CalibrationForm />} />
          <Route path="calibration/:contractId" element={<CalibrationForm />} />
          <Route path="calibration/:contractId/edit" element={<CalibrationForm />} />
        </Route>

        {/* Accounts Department */}
        <Route path="accounts">
          <Route index element={<AccountsDashboard />} />
          <Route path="dashboard" element={<AccountsDashboard />} />
          <Route path="work-planner" element={<AccountsWorkPlanner />} />
          <Route path="expense-management" element={<ExpenseManagement />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="retention" element={<Retention />} />
          <Route path="payments" element={<Payments />} />
          <Route path="tds" element={<TDS />} />
          <Route path="tasks" element={<TaskManager />} />
          <Route path="payment-requests" element={<AccountsPaymentRequests />} />
          <Route path="dept-requirements" element={<AccountsDeptRequirements />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="billing" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Sales Department */}
        <Route path="sales">
          <Route index element={<SalesDashboard />} />
          <Route path="dashboard" element={<SalesDashboard />} />
          <Route path="work-planner" element={<SalesWorkPlanner />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="orders" element={<Orders />} />
          <Route path="payment-requests" element={<SalesPaymentRequests />} />
          <Route path="dept-requirements" element={<SalesDeptRequirements />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="reports" element={<Reports />} />
          <Route path="project-profit" element={<ProjectProfitDashboard />} />
          <Route path="customer-management" element={<CustomerManagement />} />
          <Route path="order-lifecycle" element={<OrderLifecycle />} />
        </Route>

        {/* Purchase Department */}
        <Route path="purchase">
          <Route index element={<PurchaseDashboard />} />
          <Route path="dashboard" element={<PurchaseDashboard />} />
          <Route path="work-planner" element={<PurchaseWorkPlanner />} />
          <Route path="procurement" element={<PurchaseModule />} />
          <Route path="orders" element={<PurchaseOrders />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="payment-requests" element={<PurchasePaymentRequests />} />
          <Route path="dept-requirements" element={<PurchaseDeptRequirements />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Exports Department */}
        <Route path="exports">
          <Route index element={<ExportsDashboard />} />
          <Route path="dashboard" element={<ExportsDashboard />} />
          <Route path="work-planner" element={<ExportsWorkPlanner />} />
          <Route path="orders" element={<ExportOrders />} />
          <Route path="customers" element={<ExportCustomers />} />
          <Route path="shipping" element={<ShippingDocuments />} />
          <Route path="customs" element={<CustomsClearance />} />
          <Route path="payment-requests" element={<ExportsPaymentRequests />} />
          <Route path="dept-requirements" element={<ExportsDeptRequirements />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Finance Department */}
        <Route path="finance">
          <Route index element={<FinanceDashboard />} />
          <Route path="dashboard" element={<FinanceDashboard />} />
          <Route path="work-planner" element={<FinanceWorkPlanner />} />
          <Route path="budget" element={<BudgetManagement />} />
          <Route path="payment-requests" element={<PaymentRequests />} />
          <Route path="dept-requirements" element={<FinanceDeptRequirements />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="reports" element={<Reports />} />
          <Route path="expense-approvals" element={<ExpenseApprovals />} />
        </Route>

        {/* CEO/Owner */}
        <Route path="ceo">
          <Route index element={<CEOApprovals />} />
          <Route path="approvals" element={<CEOApprovals />} />
        </Route>

        {/* HR & Admin Department */}
        <Route path="hr">
          <Route index element={<HRDashboard />} />
          <Route path="dashboard" element={<HRDashboard />} />
          <Route path="work-planner" element={<HRWorkPlanner />} />
          <Route path="attendance-management" element={<AttendanceManagement />} />
          <Route path="travel-management" element={<TravelManagement />} />
          <Route path="employees" element={<EmployeeManagementFull />} />
          <Route path="payroll" element={<PayrollProcessing />} />
          <Route path="payment-requests" element={<HRPaymentRequests />} />
          <Route path="dept-requirements" element={<HRDeptRequirements />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="reports" element={<Reports />} />
          <Route path="leave-approvals" element={<LeaveApprovals />} />
          <Route path="permission-approvals" element={<PermissionApprovals />} />
        </Route>

        {/* Operations Department */}
        <Route path="operations">
          <Route index element={<OperationsDashboard />} />
          <Route path="dashboard" element={<OperationsDashboard />} />
          <Route path="work-planner" element={<OperationsWorkPlanner />} />
          <Route path="resources" element={<ResourcePlanning />} />
          <Route path="maintenance" element={<MaintenanceSchedule />} />
          <Route path="payment-requests" element={<OperationsPaymentRequests />} />
          <Route path="dept-requirements" element={<OperationsDeptRequirements />} />
          <Route path="weekly-meeting" element={<WeeklyMeeting />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Employee Hub Routes */}
        <Route path="employee">
          <Route index element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="travel-log" element={<TravelLog />} />
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="overtime" element={<OvertimeRequests />} />
          <Route path="permission" element={<PermissionRequests />} />
          <Route path="expenses" element={<ExpenseClaims />} />
          <Route path="transport" element={<TransportRequests />} />
          <Route path="journey" element={<MyJourney />} />
          <Route path="reports" element={<MyReports />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>

        {/* Company Hub Routes */}
        <Route path="company-hub">
          <Route index element={<CompanyOverview />} />
          <Route path="weekly-meetings" element={<WeeklyMeeting />} />
          <Route path="payment-requests" element={<Payments />} />
          <Route path="reports" element={<WeeklyMeeting />} />
        </Route>

        {/* Customer Hub Routes (Internal) */}
        <Route path="customer-hub">
          <Route index element={<CustomerDirectory />} />
          <Route path=":customerId" element={<CustomerProfile />} />
        </Route>

        {/* Administration Routes */}
        <Route path="admin">
          <Route index element={<Navigate to="/admin/announcements" replace />} />
          <Route path="announcements" element={<AnnouncementsManager />} />
          <Route path="events" element={<EventsManager />} />
          <Route path="holidays" element={<HolidayCalendar />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="pdf-templates" element={<PDFTemplateSettings />} />
          <Route path="shared-reports" element={<SharedReports />} />
        </Route>

        {/* Settings (shared) */}
        <Route path="settings" element={<Settings />} />
        <Route path="settings/zoho" element={<ZohoIntegration />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
