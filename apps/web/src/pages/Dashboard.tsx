import { useQuery } from '@tanstack/react-query';
import { Users, FileText, CheckCircle, TrendingDown, Building, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import apiClient from '../api/client';

type DashboardStats = {
  totalCandidates: number;
  totalApplications: number;
  hiredThisMonth: number;
  rejectionRate: number;
  statusDistribution?: { name: string; value: number }[];
  latestApplications?: {
    id: string;
    candidate_name: string;
    job_title: string;
    company: string;
    status: string;
    applied_at: string;
  }[];
};

const COLORS: Record<string, string> = {
  applied: '#64748b',   // slate-500
  screening: '#3b82f6', // blue-500
  interview: '#a855f7', // purple-500
  offer: '#f59e0b',     // amber-500
  hired: '#22c55e',     // green-500
  rejected: '#ef4444',  // red-500
};

const statusColors: Record<string, string> = {
  applied: 'bg-slate-100 text-slate-700 border-slate-200',
  screening: 'bg-blue-50 text-blue-700 border-blue-200',
  interview: 'bg-purple-50 text-purple-700 border-purple-200',
  offer: 'bg-amber-50 text-amber-700 border-amber-200',
  hired: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
      title: 'Hired This Month',
      value: stats.hiredThisMonth,
      icon: <CheckCircle className="text-green-500" size={24} />,
      bg: 'bg-green-50',
    },
    {
      title: 'Rejection Rate',
      value: `${stats.rejectionRate}%`,
      icon: <TrendingDown className="text-red-500" size={24} />,
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500 mt-1">Here is what's happening with your candidates today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      <div className="grid grid-cols-1 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[450px]">
          <h3 className="text-lg font-bold text-slate-900 mb-6 shrink-0">Application Status Distribution</h3>
          {stats.statusDistribution && stats.statusDistribution.length > 0 ? (
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    label={({ name, percent, value }) => `${name.charAt(0).toUpperCase() + name.slice(1)}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {stats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend formatter={(value) => <span className="capitalize text-slate-700 font-medium">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText size={48} className="mb-4 text-slate-300" />
              <p>No application data available to display</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-auto">
          <h3 className="text-lg font-bold text-slate-900 mb-6 shrink-0">Latest Applications</h3>
          <div className="flex-1 pr-2 space-y-4">
            {stats.latestApplications && stats.latestApplications.length > 0 ? (
              stats.latestApplications.map(app => (
                <div key={app.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-900">{app.candidate_name}</h4>
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${statusColors[app.status]}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-slate-600 flex items-center gap-1.5">
                      <Building size={14} className="text-slate-400" />
                      {app.job_title} at {app.company}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      Applied on {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText size={48} className="mb-4 text-slate-300" />
                <p>No applications yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
