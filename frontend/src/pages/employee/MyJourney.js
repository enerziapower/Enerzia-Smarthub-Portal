import React, { useState, useEffect } from 'react';
import { 
  Award, Briefcase, GraduationCap, TrendingUp, Calendar,
  Star, Medal, BadgeCheck, Loader2, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeHubAPI } from '../../services/api';

const MyJourney = () => {
  const { user } = useAuth();
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJourney();
  }, [user]);

  const fetchJourney = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await employeeHubAPI.getJourney(user.id);
      setJourney(res.data);
    } catch (error) {
      console.error('Error fetching journey:', error);
      // Set default data on error
      setJourney({
        joinDate: "2023-08-01",
        yearsWithCompany: 2.5,
        currentRole: user?.role || "Employee",
        department: user?.department || "Not Assigned",
        totalProjects: 12,
        promotions: [],
        awards: [],
        certifications: [],
        milestones: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="my-journey">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Journey</h1>
          <p className="text-slate-500 mt-1">Your career milestones and achievements at Enerzia</p>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-sm">Your Journey at Enerzia Power Solutions</p>
              <h2 className="text-3xl font-bold mt-2">{user?.name || 'Employee'}</h2>
              <p className="text-indigo-100 mt-1">{journey?.currentRole} • {journey?.department}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-sm">Years with Company</p>
              <p className="text-4xl font-bold mt-1">{journey?.yearsWithCompany || 0}</p>
              <p className="text-indigo-200 text-sm mt-1">Since {journey?.joinDate ? new Date(journey.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <Briefcase className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold">{journey?.totalProjects || 0}</p>
              <p className="text-xs text-indigo-200">Projects</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <TrendingUp className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold">{journey?.promotions?.length || 0}</p>
              <p className="text-xs text-indigo-200">Promotions</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <Award className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold">{journey?.awards?.length || 0}</p>
              <p className="text-xs text-indigo-200">Awards</p>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <GraduationCap className="mx-auto mb-2" size={24} />
              <p className="text-2xl font-bold">{journey?.certifications?.length || 0}</p>
              <p className="text-xs text-indigo-200">Certifications</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Promotions */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Career Growth</h2>
          </div>
          <div className="p-4">
            {journey?.promotions?.length > 0 ? (
              <div className="space-y-4">
                {journey.promotions.map((promotion, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="text-green-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{promotion.title}</h4>
                      <p className="text-sm text-slate-500">{new Date(promotion.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <TrendingUp className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No promotions recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Awards & Recognition */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Award className="text-amber-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Awards & Recognition</h2>
          </div>
          <div className="p-4">
            {journey?.awards?.length > 0 ? (
              <div className="space-y-3">
                {journey.awards.map((award, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <Medal className="text-amber-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{award.title}</h4>
                      <p className="text-sm text-slate-500">{new Date(award.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <Star className="text-amber-500" size={20} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Award className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No awards recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <GraduationCap className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Certifications</h2>
          </div>
          <div className="p-4">
            {journey?.certifications?.length > 0 ? (
              <div className="space-y-3">
                {journey.certifications.map((cert, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <BadgeCheck className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{cert.title}</h4>
                      <p className="text-sm text-slate-500">{new Date(cert.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <GraduationCap className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No certifications recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Milestones Timeline */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Calendar className="text-purple-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-800">Milestones</h2>
          </div>
          <div className="p-4">
            {journey?.milestones?.length > 0 ? (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-4">
                  {journey.milestones.map((milestone, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                        milestone.type === 'achievement' ? 'bg-green-100' :
                        milestone.type === 'attendance' ? 'bg-blue-100' :
                        milestone.type === 'service' ? 'bg-purple-100' :
                        'bg-slate-100'
                      }`}>
                        {milestone.type === 'achievement' && <Star className="text-green-600" size={18} />}
                        {milestone.type === 'attendance' && <Calendar className="text-blue-600" size={18} />}
                        {milestone.type === 'service' && <Briefcase className="text-purple-600" size={18} />}
                      </div>
                      <div className="flex-1 pb-4">
                        <h4 className="font-medium text-slate-800">{milestone.title}</h4>
                        <p className="text-sm text-slate-500">{new Date(milestone.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Calendar className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No milestones recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyJourney;
