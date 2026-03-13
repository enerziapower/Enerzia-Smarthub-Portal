/**
 * Customer Portal - Business Hub Tab
 * 
 * Purpose: Customer-facing portal preview and management
 * Note: This is a placeholder for the future Customer Portal feature
 */

import React from 'react';
import {
  Users, Globe, FileText, DollarSign, Clock, CheckCircle,
  ExternalLink, Settings, Eye, Lock, Shield
} from 'lucide-react';

const CustomerPortal = () => {
  return (
    <div className="space-y-6" data-testid="customer-portal">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <Globe className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Customer Portal</h2>
              <p className="text-sm text-slate-500">Customer-facing portal for project tracking and invoices</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Project Tracking */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-100 rounded-lg">
              <FileText size={20} className="text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Project Tracking</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Allow customers to track their project progress, view milestones, and access project documents.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Real-time status updates</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Document download</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Progress milestones</span>
            </div>
          </div>
        </div>

        {/* Invoice Access */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Invoice Access</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Customers can view and download invoices, track payment history, and see outstanding balances.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Invoice PDF download</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Payment history</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Outstanding balance view</span>
            </div>
          </div>
        </div>

        {/* Service Reports */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Service Reports</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Access test reports, inspection certificates, and service completion documents.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Test report downloads</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>Inspection certificates</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={14} className="text-green-500" />
              <span>WCC documents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Why Customer Portal?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-cyan-400" />
              <span className="font-medium">24/7 Access</span>
            </div>
            <p className="text-sm text-slate-300">
              Customers can check project status and documents anytime, reducing support calls.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className="text-green-400" />
              <span className="font-medium">Secure Access</span>
            </div>
            <p className="text-sm text-slate-300">
              Each customer gets unique login credentials with access only to their projects.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-violet-400" />
              <span className="font-medium">Better Communication</span>
            </div>
            <p className="text-sm text-slate-300">
              Transparent project updates build trust and improve customer relationships.
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Settings size={24} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">Feature Under Development</h3>
            <p className="text-sm text-amber-700 mb-4">
              The Customer Portal is currently in the development roadmap. This feature will enable your customers 
              to access their project information, invoices, and reports through a secure online portal.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                Q2 2025 Target
              </span>
              <span className="px-3 py-1 bg-white text-amber-700 rounded-full text-xs font-medium border border-amber-300">
                Priority: P1
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
