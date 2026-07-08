import { useQuery } from '@tanstack/react-query';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';
import apiClient from '../api/client';

type DashboardStats = {
  totalCandidates: number;
  totalApplications: number;
  activeApplications: number;
  hiredCandidates: number;
};

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/stats');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          Failed to load dashboard statistics. Make sure the API is running.
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Candidates',
      value: stats.totalCandidates,
      icon: <Users className="text-blue-500" size={24} />,
      bg: 'bg-blue-50',
    },
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: <FileText className="text-indigo-500" size={24} />,
      bg: 'bg-indigo-50',
    },
    {
      title: 'Active Applications',
      value: stats.activeApplications,
      icon: <Clock className="text-amber-500" size={24} />,
      bg: 'bg-amber-50',
    },
    {
      title: 'Hired',
      value: stats.hiredCandidates,
      icon: <CheckCircle className="text-green-500" size={24} />,
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500 mt-1">Here is what's happening with your candidates today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
              <h3 className="text-3xl font-bold text-slate-900">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
