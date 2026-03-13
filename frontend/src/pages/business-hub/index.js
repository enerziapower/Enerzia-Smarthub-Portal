/**
 * Business Hub - Central Hub for Order Flow, Tracking, Payments, Materials & Daily Tasks
 * 
 * Tabs:
 * 1. Daily Stand-up (SOM) - Daily task whiteboard for all departments
 * 2. Order Management - Sales order lifecycle & budget allocation
 * 3. Project Management - Project execution & progress tracking
 * 4. Purchase Management - Procurement, PO, GRN
 * 5. Expense Management - Expense tracking & approvals
 * 6. Payment Management - Payment request workflow
 * 7. Billing Management - Weekly billing schedules
 * 8. Finance Analytics - P&L, Savings, Cash Flow
 * 9. Weekly Meetings - Department meeting minutes
 * 10. Customer Portal - Customer-facing portal
 */

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, ClipboardList, ShoppingCart, FolderKanban, Package, 
  Receipt, CreditCard, DollarSign, TrendingUp, Calendar, Users,
  ChevronRight
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Import tab components
import DailyStandup from './DailyStandup';
import OrderManagement from './OrderManagement';
import ProjectManagement from './ProjectManagement';
import PurchaseManagement from './PurchaseManagement';
import ExpenseManagement from './ExpenseManagement';
import PaymentManagement from './PaymentManagement';
import BillingManagement from './BillingManagement';
import FinanceAnalytics from './FinanceAnalytics';
import WeeklyMeetings from './WeeklyMeetings';
import CustomerPortal from './CustomerPortal';

const TABS = [
  { id: 'som', label: 'Daily Stand-up', icon: ClipboardList, color: 'blue' },
  { id: 'orders', label: 'Order Management', icon: ShoppingCart, color: 'emerald' },
  { id: 'projects', label: 'Project Management', icon: FolderKanban, color: 'violet' },
  { id: 'purchase', label: 'Purchase Management', icon: Package, color: 'amber' },
  { id: 'expenses', label: 'Expense Management', icon: Receipt, color: 'rose' },
  { id: 'payments', label: 'Payment Management', icon: CreditCard, color: 'cyan' },
  { id: 'billing', label: 'Billing Management', icon: DollarSign, color: 'green' },
  { id: 'finance', label: 'Finance Analytics', icon: TrendingUp, color: 'indigo' },
  { id: 'meetings', label: 'Weekly Meetings', icon: Calendar, color: 'orange' },
  { id: 'customer', label: 'Customer Portal', icon: Users, color: 'slate' },
];

const BusinessHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasSubModuleAccess, isSuperAdmin } = useAuth();
  
  // Get active tab from URL or default to 'som'
  const activeTab = searchParams.get('tab') || 'som';

  // Check access for each tab
  const canAccessTab = (tabId) => {
    if (isSuperAdmin) return true;
    // Map tab IDs to sub-module IDs for access control
    const subModuleMap = {
      'som': 'business_hub_som',
      'orders': 'business_hub_orders',
      'projects': 'business_hub_projects',
      'purchase': 'business_hub_purchase',
      'expenses': 'business_hub_expenses',
      'payments': 'business_hub_payments',
      'billing': 'business_hub_billing',
      'finance': 'business_hub_finance',
      'meetings': 'business_hub_meetings',
      'customer': 'business_hub_customer',
    };
    return hasSubModuleAccess(subModuleMap[tabId]);
  };

  // Filter accessible tabs
  const accessibleTabs = TABS.filter(tab => canAccessTab(tab.id));

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'som':
        return <DailyStandup />;
      case 'orders':
        return <OrderManagement />;
      case 'projects':
        return <ProjectManagement />;
      case 'purchase':
        return <PurchaseManagement />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'billing':
        return <BillingManagement />;
      case 'finance':
        return <FinanceAnalytics />;
      case 'meetings':
        return <WeeklyMeetings />;
      case 'customer':
        return <CustomerPortal />;
      default:
        return <DailyStandup />;
    }
  };

  const activeTabData = TABS.find(t => t.id === activeTab) || TABS[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <Briefcase className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Business Hub</h1>
            <p className="text-sm text-slate-500">
              Central hub for orders, projects, payments, materials & daily tasks
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1 overflow-x-auto py-2 scrollbar-thin">
          {accessibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? `bg-${tab.color}-50 text-${tab.color}-700 border border-${tab.color}-200`
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-6 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Briefcase size={14} />
          <span>Business Hub</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-800">{activeTabData.label}</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BusinessHub;
