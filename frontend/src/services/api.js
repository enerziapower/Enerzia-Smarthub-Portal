import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ DATE FORMAT UTILITIES ============
// Convert date from various formats to DD-MM-YYYY for display
export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  
  // If already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  
  // Try to parse the date
  try {
    let date;
    
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}-${month}-${year}`;
    }
    
    // Handle DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr.replace(/\//g, '-');
    }
    
    // Try parsing as Date object
    date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }
  
  return dateStr; // Return original if parsing fails
};

// Convert DD-MM-YYYY to YYYY-MM-DD for HTML date input
export const formatDateInput = (dateStr) => {
  if (!dateStr) return '';
  
  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Handle DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  }
  
  // Handle DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      if (token) {
        // Only clear and redirect if we had a token (means it expired/invalidated)
        localStorage.removeItem('token');
        // Only redirect if not already on login page to prevent infinite loop
        if (window.location.pathname !== '/login') {
          console.log('Session expired, redirecting to login');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  check: () => api.get('/auth/check'),
  changePassword: (data) => api.put('/auth/change-password', data),
  // Forgot Password / OTP
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  resetPassword: (email, reset_token, new_password) => api.post('/auth/reset-password', { email, reset_token, new_password }),
};

// User Management API (Admin only)
export const usersAPI = {
  getAll: () => api.get('/users'),
  invite: (data) => api.post('/users/invite', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.put(`/users/${id}/password`, data),
};

// Departments API
export const departmentsAPI = {
  getAll: () => api.get('/departments'),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getNextPID: (financialYear) => api.get('/projects/next-pid', { params: financialYear ? { financial_year: financialYear } : {} }),
  exportExcel: () => api.get('/projects/export/excel', { responseType: 'blob' }),
  exportPDF: () => api.get('/projects/export/pdf', { responseType: 'blob' }),
  importExcel: (formData) => api.post('/projects/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadPO: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload-po', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Project Requirements API
export const projectRequirementsAPI = {
  getAll: (params) => api.get('/project-requirements', { params }),
  getById: (id) => api.get(`/project-requirements/${id}`),
  create: (data) => api.post('/project-requirements', data),
  update: (id, data) => api.put(`/project-requirements/${id}`, data),
  delete: (id) => api.delete(`/project-requirements/${id}`),
  getSummary: () => api.get('/project-requirements/stats/summary'),
};

// Department Tasks API (Work Planner Tasks)
export const departmentTasksAPI = {
  getAll: (params) => api.get('/department-tasks', { params }),
  getByDepartment: (department) => api.get('/department-tasks', { params: { department } }),
  getById: (id) => api.get(`/department-tasks/${id}`),
  create: (data) => api.post('/department-tasks', data),
  update: (id, data) => api.put(`/department-tasks/${id}`, data),
  delete: (id) => api.delete(`/department-tasks/${id}`),
  getStats: (department) => api.get(`/department-tasks/stats/${department}`),
};

// Add getTasks, createTask, updateTask, deleteTask to departmentTeamAPI for compatibility
export const departmentTeamAPIExtended = {
  getTasks: (department) => api.get('/department-tasks', { params: { department } }),
  createTask: (data) => api.post('/department-tasks', data),
  updateTask: (id, data) => api.put(`/department-tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/department-tasks/${id}`),
};

export const billingAPI = {
  getWeekly: () => api.get('/billing/weekly'),
  getCumulative: () => api.get('/billing/cumulative'),
};

// Work Completion Certificate API
export const workCompletionAPI = {
  getAll: () => api.get('/work-completion'),
  getById: (id) => api.get(`/work-completion/${id}`),
  create: (data) => api.post('/work-completion', data),
  update: (id, data) => api.put(`/work-completion/${id}`, data),
  delete: (id) => api.delete(`/work-completion/${id}`),
  downloadPDF: (id) => api.get(`/work-completion/${id}/pdf`, { responseType: 'blob' }),
};

// Customer Service Request API
export const customerServiceAPI = {
  getAll: (params) => api.get('/customer-service', { params }),
  getById: (id) => api.get(`/customer-service/${id}`),
  create: (data) => api.post('/customer-service', data),
  update: (id, data) => api.put(`/customer-service/${id}`, data),
  delete: (id) => api.delete(`/customer-service/${id}`),
  downloadPDF: (id) => api.get(`/customer-service/${id}/pdf`, { responseType: 'blob' }),
  getNextSRN: () => api.get('/customer-service/next-srn'),
};

// Settings API
export const settingsAPI = {
  // Organization Settings
  getOrganization: () => api.get('/settings/organization'),
  updateOrganization: (data) => api.put('/settings/organization', data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/settings/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteLogo: () => api.delete('/settings/delete-logo'),
  
  // General Settings
  getGeneral: () => api.get('/settings/general'),
  updateGeneral: (data) => api.put('/settings/general', data),
  
  // Team Members (Engineers)
  getEngineers: () => api.get('/settings/engineers'),
  createEngineer: (data) => api.post('/settings/engineers', data),
  updateEngineer: (id, data) => api.put(`/settings/engineers/${id}`, data),
  deleteEngineer: (id) => api.delete(`/settings/engineers/${id}`),
  seedEngineers: () => api.post('/settings/seed-engineers'),
  
  // Clients
  getClients: (customerType) => api.get('/settings/clients', { params: customerType ? { customer_type: customerType } : {} }),
  getDomesticClients: () => api.get('/settings/clients', { params: { customer_type: 'domestic' } }),
  getOverseasClients: () => api.get('/settings/clients', { params: { customer_type: 'overseas' } }),
  createClient: (data) => api.post('/settings/clients', data),
  updateClient: (id, data) => api.put(`/settings/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/settings/clients/${id}`),
  seedClients: () => api.post('/settings/seed-clients'),
  
  // Vendors
  getVendors: () => api.get('/settings/vendors'),
  createVendor: (data) => api.post('/settings/vendors', data),
  updateVendor: (id, data) => api.put(`/settings/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/settings/vendors/${id}`),
  seedVendors: () => api.post('/settings/seed-vendors'),
  
  // Categories
  getCategories: () => api.get('/settings/categories'),
  createCategory: (data) => api.post('/settings/categories', data),
  updateCategory: (id, data) => api.put(`/settings/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/settings/categories/${id}`),
  
  // Statuses
  getStatuses: () => api.get('/settings/statuses'),
  createStatus: (data) => api.post('/settings/statuses', data),
  updateStatus: (id, data) => api.put(`/settings/statuses/${id}`, data),
  deleteStatus: (id) => api.delete(`/settings/statuses/${id}`),
  
  // Email Templates
  getEmailTemplate: () => api.get('/settings/email-template'),
  updateEmailTemplate: (data) => api.put('/settings/email-template', data),
  uploadEmailLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/settings/email-template/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  previewEmailTemplate: (data) => api.post('/settings/email-template/preview', data),
};

// Weekly Meeting API
export const weeklyMeetingAPI = {
  getAll: (params) => api.get('/weekly-meetings', { params }),
  getById: (id) => api.get(`/weekly-meetings/${id}`),
  create: (data) => api.post('/weekly-meetings', data),
  update: (id, data) => api.put(`/weekly-meetings/${id}`, data),
  delete: (id) => api.delete(`/weekly-meetings/${id}`),
  getSummary: () => api.get('/weekly-meetings/summary/current'),
  getDepartments: () => api.get('/weekly-meetings/departments/list'),
  downloadPDF: (id) => `${api.defaults.baseURL}/weekly-meetings/${id}/pdf`,
};

export const seedData = () => api.post('/seed-data');

// Accounts Department API
export const accountsAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/accounts/dashboard/stats'),
  
  // Invoices
  getInvoices: (params) => api.get('/accounts/invoices', { params }),
  createInvoice: (data) => api.post('/accounts/invoices', data),
  updateInvoice: (id, data) => api.put(`/accounts/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/accounts/invoices/${id}`),
  importInvoices: (formData) => api.post('/accounts/import/invoices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Overdue Invoices
  getOverdueInvoices: () => api.get('/accounts/overdue-invoices'),
  createOverdueInvoice: (data) => api.post('/accounts/overdue-invoices', data),
  updateOverdueInvoice: (id, data) => api.put(`/accounts/overdue-invoices/${id}`, data),
  deleteOverdueInvoice: (id) => api.delete(`/accounts/overdue-invoices/${id}`),
  importOverdue: (formData) => api.post('/accounts/import/overdue', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Retention Invoices
  getRetention: () => api.get('/accounts/retention'),
  createRetention: (data) => api.post('/accounts/retention', data),
  updateRetention: (id, data) => api.put(`/accounts/retention/${id}`, data),
  deleteRetention: (id) => api.delete(`/accounts/retention/${id}`),
  importRetention: (formData) => api.post('/accounts/import/retention', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Payments & Collections
  getPayments: (params) => api.get('/accounts/payments', { params }),
  createPayment: (data) => api.post('/accounts/payments', data),
  updatePayment: (id, data) => api.put(`/accounts/payments/${id}`, data),
  deletePayment: (id) => api.delete(`/accounts/payments/${id}`),
  
  // TDS
  getTDS: (params) => api.get('/accounts/tds', { params }),
  createTDS: (data) => api.post('/accounts/tds', data),
  updateTDS: (id, data) => api.put(`/accounts/tds/${id}`, data),
  deleteTDS: (id) => api.delete(`/accounts/tds/${id}`),
  
  // GSTR
  getGSTR: (params) => api.get('/accounts/gstr', { params }),
  createGSTR: (data) => api.post('/accounts/gstr', data),
  updateGSTR: (id, data) => api.put(`/accounts/gstr/${id}`, data),
  
  // Tasks
  getTasks: (params) => api.get('/accounts/tasks', { params }),
  createTask: (data) => api.post('/accounts/tasks', data),
  updateTask: (id, data) => api.put(`/accounts/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/accounts/tasks/${id}`),
  importTasks: (formData) => api.post('/accounts/import/tasks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Billing Projections
  getProjections: () => api.get('/accounts/projections'),
  createProjection: (data) => api.post('/accounts/projections', data),
  updateProjection: (id, data) => api.put(`/accounts/projections/${id}`, data),
  
  // Weekly Summary
  getWeeklySummary: (params) => api.get('/accounts/weekly-summary', { params }),
  createWeeklySummary: (data) => api.post('/accounts/weekly-summary', data),
};

// Department Team Members API
export const departmentTeamAPI = {
  getTeam: (department) => api.get(`/departments/${department}/team`),
  getMember: (department, id) => api.get(`/departments/${department}/team/${id}`),
  createMember: (department, data) => api.post(`/departments/${department}/team`, data),
  updateMember: (department, id, data) => api.put(`/departments/${department}/team/${id}`, data),
  deleteMember: (department, id) => api.delete(`/departments/${department}/team/${id}`),
  importFromEngineers: (department) => api.post(`/departments/${department}/team/import-from-engineers`),
  uploadPhoto: (department, memberId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/departments/${department}/team/${memberId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deletePhoto: (department, memberId) => api.delete(`/departments/${department}/team/${memberId}/photo`),
};

// Exports Department API
export const exportsAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/exports/dashboard/stats'),
  
  // Customers
  getCustomers: () => api.get('/exports/customers'),
  getCustomer: (id) => api.get(`/exports/customers/${id}`),
  createCustomer: (data) => api.post('/exports/customers', data),
  updateCustomer: (id, data) => api.put(`/exports/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/exports/customers/${id}`),
  seedCustomers: () => api.post('/exports/customers/seed'),
  
  // Orders
  getOrders: () => api.get('/exports/orders'),
  createOrder: (data) => api.post('/exports/orders', data),
  updateOrder: (id, data) => api.put(`/exports/orders/${id}`, data),
  deleteOrder: (id) => api.delete(`/exports/orders/${id}`),
  
  // Invoices
  getInvoices: () => api.get('/exports/invoices'),
  createInvoice: (data) => api.post('/exports/invoices', data),
  
  // Payments
  getPayments: () => api.get('/exports/payments'),
  createPayment: (data) => api.post('/exports/payments', data),
};

// Payment Requests API
export const paymentRequestsAPI = {
  getAll: (params) => api.get('/payment-requests', { params }),
  getById: (id) => api.get(`/payment-requests/${id}`),
  create: (data) => api.post('/payment-requests', data),
  update: (id, data) => api.put(`/payment-requests/${id}`, data),
  delete: (id) => api.delete(`/payment-requests/${id}`),
  getNextPRNo: () => api.get('/payment-requests/next-pr-no'),
  getStats: () => api.get('/payment-requests/stats'),
  getByProject: (projectId) => api.get(`/payment-requests/by-project/${projectId}`),
  financeReview: (id, data) => api.put(`/payment-requests/${id}/finance-review`, data),
  ceoApprove: (id, data) => api.put(`/payment-requests/${id}/ceo-approve`, data),
  markPaid: (id, data) => api.put(`/payment-requests/${id}/mark-paid`, data),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getCount: (params) => api.get('/notifications/count', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: (department) => api.put('/notifications/mark-all-read', null, { params: { department } }),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Test Reports API
export const testReportsAPI = {
  getAll: (params) => api.get('/test-reports', { params }),
  getById: (id) => api.get(`/test-reports/${id}`),
  getByEquipment: (equipmentType) => api.get(`/test-reports/equipment/${equipmentType}`),
  create: (data) => api.post('/test-reports', data),
  update: (id, data) => api.put(`/test-reports/${id}`, data),
  delete: (id) => api.delete(`/test-reports/${id}`),
  getNextReportNo: (equipmentType) => api.get(`/test-reports/next-report-no/${equipmentType}`),
  downloadPdf: (id) => api.get(`/test-reports/${id}/pdf`, { responseType: 'blob' }),
  // Equipment templates
  getAllTemplates: () => api.get('/test-reports/templates/all'),
  getTemplate: (equipmentType) => api.get(`/test-reports/templates/${equipmentType}`),
};

// Scheduled Inspections API
export const scheduledInspectionsAPI = {
  getAll: (params) => api.get('/scheduled-inspections', { params }),
  getDashboard: () => api.get('/scheduled-inspections/dashboard'),
  getById: (id) => api.get(`/scheduled-inspections/${id}`),
  create: (data) => api.post('/scheduled-inspections', data),
  update: (id, data) => api.put(`/scheduled-inspections/${id}`, data),
  complete: (id, data) => api.put(`/scheduled-inspections/${id}/complete`, data),
  delete: (id) => api.delete(`/scheduled-inspections/${id}`),
};

// Employee Hub API
export const employeeHubAPI = {
  // Overtime Requests
  getOvertimeRequests: (params) => api.get('/employee/overtime', { params }),
  createOvertimeRequest: (data, userId, userName, department) => 
    api.post(`/employee/overtime?user_id=${userId}&user_name=${encodeURIComponent(userName)}&department=${department}`, data),
  approveOvertimeRequest: (id, approvedBy) => 
    api.put(`/employee/overtime/${id}/approve?approved_by=${encodeURIComponent(approvedBy)}`),
  rejectOvertimeRequest: (id, approvedBy) => 
    api.put(`/employee/overtime/${id}/reject?approved_by=${encodeURIComponent(approvedBy)}`),
  deleteOvertimeRequest: (id) => api.delete(`/employee/overtime/${id}`),
  
  // Permission Requests
  getPermissionRequests: (params) => api.get('/employee/permission', { params }),
  createPermissionRequest: (data, userId, userName, department) => 
    api.post(`/employee/permission?user_id=${userId}&user_name=${encodeURIComponent(userName)}&department=${department}`, data),
  approvePermissionRequest: (id, approvedBy) => 
    api.put(`/employee/permission/${id}/approve?approved_by=${encodeURIComponent(approvedBy)}`),
  rejectPermissionRequest: (id, approvedBy) => 
    api.put(`/employee/permission/${id}/reject?approved_by=${encodeURIComponent(approvedBy)}`),
  
  // Transport Requests
  getTransportRequests: (params) => api.get('/employee/transport', { params }),
  createTransportRequest: (data, userId, userName, department) => 
    api.post(`/employee/transport?user_id=${userId}&user_name=${encodeURIComponent(userName)}&department=${department}`, data),
  approveTransportRequest: (id, approvedBy, vehicle) => 
    api.put(`/employee/transport/${id}/approve?approved_by=${encodeURIComponent(approvedBy)}${vehicle ? `&vehicle=${encodeURIComponent(vehicle)}` : ''}`),
  rejectTransportRequest: (id, approvedBy) => 
    api.put(`/employee/transport/${id}/reject?approved_by=${encodeURIComponent(approvedBy)}`),
  
  // Leave Requests
  getLeaveRequests: (params) => api.get('/employee/leave', { params }),
  createLeaveRequest: (data, userId, userName, department) => 
    api.post(`/employee/leave?user_id=${userId}&user_name=${encodeURIComponent(userName)}&department=${department}`, data),
  approveLeaveRequest: (id, approvedBy) => 
    api.put(`/employee/leave/${id}/approve?approved_by=${encodeURIComponent(approvedBy)}`),
  rejectLeaveRequest: (id, approvedBy) => 
    api.put(`/employee/leave/${id}/reject?approved_by=${encodeURIComponent(approvedBy)}`),
  getLeaveBalance: (userId) => api.get(`/employee/leave/balance/${userId}`),
  
  // Expense Claims
  getExpenseClaims: (params) => api.get('/employee/expenses', { params }),
  createExpenseClaim: (data, userId, userName, department) => 
    api.post(`/employee/expenses?user_id=${userId}&user_name=${encodeURIComponent(userName)}&department=${department}`, data),
  approveExpenseClaim: (id, approvedBy) => 
    api.put(`/employee/expenses/${id}/approve?approved_by=${encodeURIComponent(approvedBy)}`),
  rejectExpenseClaim: (id, approvedBy) => 
    api.put(`/employee/expenses/${id}/reject?approved_by=${encodeURIComponent(approvedBy)}`),
  
  // Dashboard
  getDashboard: (userId) => api.get(`/employee/dashboard/${userId}`),
  
  // Attendance
  getAttendance: (userId, month, year) => 
    api.get(`/employee/attendance/${userId}`, { params: { month, year } }),
  checkIn: (userId, userName) => 
    api.post(`/employee/attendance/check-in?user_id=${userId}&user_name=${encodeURIComponent(userName)}`),
  checkOut: (userId) => 
    api.post(`/employee/attendance/check-out?user_id=${userId}`),
  
  // Journey
  getJourney: (userId) => api.get(`/employee/journey/${userId}`),
};

// Admin Hub API
export const adminHubAPI = {
  // Announcements
  getAnnouncements: (params) => api.get('/admin/announcements', { params }),
  getActiveAnnouncements: (targetAudience) => 
    api.get('/admin/announcements/active', { params: { target_audience: targetAudience } }),
  createAnnouncement: (data, createdBy) => 
    api.post(`/admin/announcements?created_by=${encodeURIComponent(createdBy)}`, data),
  updateAnnouncement: (id, data) => api.put(`/admin/announcements/${id}`, data),
  updateAnnouncementStatus: (id, status) => 
    api.put(`/admin/announcements/${id}/status?status=${status}`),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  
  // Events
  getEvents: (params) => api.get('/admin/events', { params }),
  getUpcomingEvents: (limit) => api.get('/admin/events/upcoming', { params: { limit } }),
  createEvent: (data, createdBy) => 
    api.post(`/admin/events?created_by=${encodeURIComponent(createdBy)}`, data),
  updateEvent: (id, data) => api.put(`/admin/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/admin/events/${id}`),
  
  // Holidays
  getHolidays: (params) => api.get('/admin/holidays', { params }),
  getUpcomingHolidays: (limit) => api.get('/admin/holidays/upcoming', { params: { limit } }),
  createHoliday: (data) => api.post('/admin/holidays', data),
  updateHoliday: (id, data) => api.put(`/admin/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/admin/holidays/${id}`),
  
  // Dashboard Data (for main company dashboard)
  getDashboardData: (department) => 
    api.get('/admin/dashboard-data', { params: { department } }),
  
  // Admin Stats
  getStats: () => api.get('/admin/stats'),
};

// Company Hub API
export const companyHubAPI = {
  // Weekly Meetings
  getWeeklyMeetings: (params) => api.get('/company/weekly-meetings', { params }),
  getWeeklyMeeting: (id) => api.get(`/company/weekly-meetings/${id}`),
  createWeeklyMeeting: (data, submittedBy, submittedById) => 
    api.post(`/company/weekly-meetings?submitted_by=${encodeURIComponent(submittedBy)}&submitted_by_id=${submittedById}`, data),
  updateWeeklyMeeting: (id, data) => api.put(`/company/weekly-meetings/${id}`, data),
  deleteWeeklyMeeting: (id) => api.delete(`/company/weekly-meetings/${id}`),
  getWeeklySummary: (weekStart) => api.get(`/company/weekly-meetings/summary/departments?week_start=${weekStart}`),
  
  // Payment Requests
  getPaymentRequests: (params) => api.get('/company/payment-requests', { params }),
  getPaymentRequest: (id) => api.get(`/company/payment-requests/${id}`),
  createPaymentRequest: (data, requestedBy, requestedById) => 
    api.post(`/company/payment-requests?requested_by=${encodeURIComponent(requestedBy)}&requested_by_id=${requestedById}`, data),
  updatePaymentRequest: (id, data) => api.put(`/company/payment-requests/${id}`, data),
  approvePaymentRequest: (id, approvedBy) => 
    api.put(`/company/payment-requests/${id}/approve?approved_by=${encodeURIComponent(approvedBy)}`),
  rejectPaymentRequest: (id, rejectedBy, reason) => 
    api.put(`/company/payment-requests/${id}/reject?rejected_by=${encodeURIComponent(rejectedBy)}&reason=${encodeURIComponent(reason || '')}`),
  processPaymentRequest: (id, processedBy, transactionRef) => 
    api.put(`/company/payment-requests/${id}/process?processed_by=${encodeURIComponent(processedBy)}&transaction_ref=${encodeURIComponent(transactionRef || '')}`),
  deletePaymentRequest: (id) => api.delete(`/company/payment-requests/${id}`),
  getPaymentRequestsStats: () => api.get('/company/payment-requests/stats/summary'),
};

export default api;
