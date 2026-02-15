import { 
  Package, Truck, FileText, Users, CreditCard, ClipboardCheck,
  AlertCircle, CheckCircle2, MessageSquare
} from 'lucide-react';

// Requirement types with icons
export const REQUIREMENT_TYPES = [
  { value: 'Material Purchase', label: 'Material Purchase', icon: Package },
  { value: 'Delivery', label: 'Delivery', icon: Truck },
  { value: 'Vendor P.O.', label: 'Vendor P.O.', icon: FileText },
  { value: 'Manpower Arrangements', label: 'Manpower Arrangements', icon: Users },
  { value: 'Payment Request', label: 'Payment Request', icon: CreditCard },
  { value: 'Documentation', label: 'Documentation', icon: FileText },
  { value: 'Inspection', label: 'Inspection', icon: ClipboardCheck },
  { value: 'Approval', label: 'Approval', icon: CheckCircle2 },
  { value: 'Information Request', label: 'Information Request', icon: MessageSquare },
  { value: 'Other', label: 'Other', icon: AlertCircle },
];

export const DEPARTMENTS = [
  { code: 'PROJECTS', label: 'Projects Dept' },
  { code: 'ACCOUNTS', label: 'Accounts Dept' },
  { code: 'SALES', label: 'Sales Dept' },
  { code: 'PURCHASE', label: 'Purchase Dept' },
  { code: 'EXPORTS', label: 'Exports Dept' },
  { code: 'FINANCE', label: 'Finance Dept' },
  { code: 'HR', label: 'HR Dept' },
  { code: 'OPERATIONS', label: 'Operations Dept' },
];

export const PRIORITIES = [
  { value: 'Low', color: 'bg-slate-100 text-slate-700' },
  { value: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'Urgent', color: 'bg-red-100 text-red-700' },
];

export const STATUSES = [
  { value: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'Completed', color: 'bg-green-100 text-green-700' },
  { value: 'On Hold', color: 'bg-gray-100 text-gray-700' },
  { value: 'Rejected', color: 'bg-red-100 text-red-700' },
];

export const getTypeIcon = (type) => {
  const found = REQUIREMENT_TYPES.find(t => t.value === type);
  return found ? found.icon : AlertCircle;
};

export const getPriorityStyle = (priority) => {
  const found = PRIORITIES.find(p => p.value === priority);
  return found ? found.color : 'bg-slate-100 text-slate-700';
};

export const getStatusStyle = (status) => {
  const found = STATUSES.find(s => s.value === status);
  return found ? found.color : 'bg-slate-100 text-slate-700';
};

export const getDeptLabel = (code) => {
  const found = DEPARTMENTS.find(d => d.code === code);
  return found ? found.label : code;
};
