import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, FileText, Clock, ChevronRight,
  // Better matched icons for each equipment
  Repeat, // Transformer (coil/winding symbol)
  Target, // Earth Pit (ground/target)
  Activity, // Energy Meter (measurement/activity)
  ToggleRight, // MCCB (switch/breaker)
  Power, // ACB (power switch)
  Cpu, // VCB (vacuum/circuit)
  Cog, // DG (generator/engine)
  Sun, // Lighting (light/sun)
  Zap, // Lightning Arrestor (lightning)
  BatteryCharging, // UPS (battery)
  LayoutGrid, // Electrical Panel (grid/panel)
  Gauge, // Voltmeter (gauge/meter)
  TrendingUp, // Ammeter (current flow)
  Shield, // Relay (protection)
  Percent, // APFC (power factor %)
  Battery // Battery
} from 'lucide-react';

const EQUIPMENT_TYPES = [
  {
    id: 'transformer',
    name: 'Transformer',
    icon: Repeat,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    description: 'HT/LT Transformer testing and maintenance reports'
  },
  {
    id: 'earth-pit',
    name: 'Earth Pit',
    icon: Target,
    color: 'bg-green-600',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700',
    description: 'Earth resistance and grounding test reports'
  },
  {
    id: 'energy-meter',
    name: 'Energy Meter',
    icon: Activity,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Energy meter calibration and accuracy reports'
  },
  {
    id: 'voltmeter',
    name: 'Voltmeter',
    icon: Gauge,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    description: 'Voltmeter calibration and accuracy reports'
  },
  {
    id: 'ammeter',
    name: 'Ammeter',
    icon: TrendingUp,
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    description: 'Ammeter calibration and accuracy reports'
  },
  {
    id: 'mccb',
    name: 'MCCB',
    fullName: 'Moulded Case Circuit Breaker',
    icon: ToggleRight,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    description: 'MCCB trip test and contact resistance reports'
  },
  {
    id: 'acb',
    name: 'ACB',
    fullName: 'Air Circuit Breaker',
    icon: Power,
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-700',
    description: 'ACB operation test and maintenance reports'
  },
  {
    id: 'vcb',
    name: 'VCB',
    fullName: 'Vacuum Circuit Breaker',
    icon: Cpu,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    description: 'VCB vacuum integrity and timing test reports'
  },
  {
    id: 'dg',
    name: 'DG',
    fullName: 'Diesel Generator',
    icon: Cog,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    description: 'DG load test and performance reports'
  },
  {
    id: 'lighting',
    name: 'Lighting',
    icon: Sun,
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    description: 'Lux level measurement and lighting audit reports'
  },
  {
    id: 'lightning-arrestor',
    name: 'Lightning Arrestor',
    icon: Zap,
    color: 'bg-slate-600',
    lightColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    description: 'Lightning arrestor insulation and leakage test reports'
  },
  {
    id: 'ups',
    name: 'UPS',
    fullName: 'Uninterrupted Power Supply',
    icon: BatteryCharging,
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    description: 'UPS backup time and battery health reports'
  },
  {
    id: 'electrical-panel',
    name: 'Electrical Panel',
    icon: LayoutGrid,
    color: 'bg-cyan-500',
    lightColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    description: 'Panel inspection and maintenance reports'
  },
  {
    id: 'relay',
    name: 'Relay',
    fullName: 'Protection Relay',
    icon: Shield,
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    description: 'Relay calibration and functional test reports'
  },
  {
    id: 'apfc',
    name: 'APFC',
    fullName: 'Automatic Power Factor Correction',
    icon: Percent,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    description: 'APFC panel service and capacitor health reports'
  },
  {
    id: 'battery',
    name: 'Battery',
    fullName: 'Battery Bank',
    icon: Battery,
    color: 'bg-lime-600',
    lightColor: 'bg-lime-50',
    textColor: 'text-lime-700',
    description: 'Battery resistance and voltage test reports'
  }
];

const EquipmentTestReports = () => {
  const navigate = useNavigate();

  // Equipment types that use the new template-based service report form
  const SERVICE_REPORT_EQUIPMENT = ['acb', 'mccb', 'vcb', 'dg', 'ups', 'electrical-panel', 'lightning-arrestor', 'relay', 'apfc', 'earth-pit', 'energy-meter', 'voltmeter', 'ammeter', 'battery'];

  const handleEquipmentClick = (equipmentId) => {
    // Transformer has its own dedicated form
    if (equipmentId === 'transformer') {
      navigate('/projects/project-reports/equipment/transformer/new');
    } 
    // Equipment with template-based service reports
    else if (SERVICE_REPORT_EQUIPMENT.includes(equipmentId)) {
      navigate(`/projects/project-reports/service/${equipmentId}/new`);
    }
    // Default to generic form
    else {
      navigate(`/projects/project-reports/equipment/${equipmentId}/new`);
    }
  };

  const handleViewReports = (equipmentId) => {
    navigate(`/projects/project-reports/equipment/${equipmentId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/projects/project-reports"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Equipment Test Reports</h1>
            <p className="text-slate-500 mt-1">Create and manage equipment test reports</p>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {EQUIPMENT_TYPES.map((equipment) => {
          const Icon = equipment.icon;
          return (
            <div
              key={equipment.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group"
            >
              {/* Card Header with Icon */}
              <div className={`${equipment.lightColor} p-5 border-b border-slate-100`}>
                <div className="flex items-center gap-4">
                  <div className={`${equipment.color} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{equipment.name}</h3>
                    {equipment.fullName && (
                      <p className="text-xs text-slate-500 mt-0.5">{equipment.fullName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-sm text-slate-600 mb-4 min-h-[40px]">
                  {equipment.description}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEquipmentClick(equipment.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 ${equipment.color} text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity`}
                    data-testid={`create-report-${equipment.id}`}
                  >
                    <Plus size={16} />
                    New Report
                  </button>
                  <button
                    onClick={() => handleViewReports(equipment.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
                    data-testid={`view-reports-${equipment.id}`}
                  >
                    <FileText size={16} />
                    View
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EquipmentTestReports;

// Export equipment types for use in other components
export { EQUIPMENT_TYPES };
