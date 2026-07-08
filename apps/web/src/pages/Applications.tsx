import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Edit2, Save, FileText, Calendar, Building, Plus, X, Trash2 } from 'lucide-react';
import { ApplicationSchema, CandidateSchema } from '@candidate-tracker/shared';
import type { PaginatedResponse } from '@candidate-tracker/shared';
import { z } from 'zod';
import apiClient from '../api/client';

interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message: string;
}

// Extended Application type incorporating relation data.
type Application = z.infer<typeof ApplicationSchema> & {
  id: string;
  candidate_name: string;
  candidate_email: string;
  applied_at: string;
  updated_at: string;
};

type Candidate = z.infer<typeof CandidateSchema> & { id: string };

const statusColors: Record<string, string> = {
  applied: 'bg-slate-100 text-slate-700 border-slate-200',
  screening: 'bg-blue-50 text-blue-700 border-blue-200',
  interview: 'bg-purple-50 text-purple-700 border-purple-200',
  offer: 'bg-amber-50 text-amber-700 border-amber-200',
  hired: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export default function Applications() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const applicationIdFromUrl = searchParams.get('application_id');
  // Modal visualization state variables.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  
  const [formData, setFormData] = useState({
    candidate_id: '',
    job_title: '',
    company: '',
    status: 'applied',
    applied_at: new Date().toLocaleDateString('en-CA'),
    salary_expectation: '',
    source: '',
    notes: '',
  });

  const [isEditMode, setIsEditMode] = useState(false);


  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset page on new search
    }, 400); // 400ms delay

    return () => clearTimeout(handler);
  }, [searchTerm]);


  useEffect(() => {
    if (applicationIdFromUrl) {
      apiClient.get(`/applications/${applicationIdFromUrl}`).then((res) => {
        openApplicationDetails(res.data);
        setSearchParams({});
      }).catch(e => console.error(e));
    }
  }, [applicationIdFromUrl, setSearchParams]);


  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo]);

  // Retrieves paginated applications with applied filters.
  const { data: responseData, isLoading, isError } = useQuery<PaginatedResponse<Application>>({
    queryKey: ['applications', page, debouncedSearchTerm, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const response = await apiClient.get('/applications', {
        params: { 
          page, 
          limit: 10, 
          search: debouncedSearchTerm || undefined,
          status: statusFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined
        },
      });
      return response.data;
    },
  });

  const applications = responseData?.data;
  const meta = responseData?.meta;

  // Fetches candidate relation data required for the selection dropdown.
  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ['candidates-dropdown'],
    queryFn: async () => {
      const response = await apiClient.get('/candidates', { params: { limit: 100 } });
      return response.data.data;
    },
    enabled: isModalOpen || !!selectedApplication,
  });

  const sanitizePayload = (data: typeof formData) => {
    return {
      candidate_id: data.candidate_id,
      job_title: data.job_title?.trim(),
      company: data.company?.trim(),
      status: data.status,
      applied_at: data.applied_at ? new Date(data.applied_at) : new Date(),
      salary_expectation: data.salary_expectation ? parseInt(data.salary_expectation.toString(), 10) : undefined,
      source: data.source?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    };
  };

  const createApplicationMutation = useMutation({
    mutationFn: async (newApp: ReturnType<typeof sanitizePayload>) => {
      const response = await apiClient.post('/applications', newApp);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setIsModalOpen(false);
      setFormData({ candidate_id: '', job_title: '', company: '', status: 'applied', applied_at: new Date().toLocaleDateString('en-CA'), salary_expectation: '', source: '', notes: '' });
    },
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async (data: { id: string, payload: ReturnType<typeof sanitizePayload> }) => {
      const response = await apiClient.put(`/applications/${data.id}`, data.payload);
      return response.data;
    },
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setIsEditMode(false);
      // Re-inject candidate relation name after update since API omits joined fields on PUT.
      if (selectedApplication) {
        const matchingCandidate = candidates?.find(c => c.id === updatedApp.candidate_id);
        setSelectedApplication({
          ...updatedApp,
          candidate_name: matchingCandidate ? matchingCandidate.name : selectedApplication.candidate_name,
          candidate_email: matchingCandidate ? matchingCandidate.email : selectedApplication.candidate_email,
        });
      }
    },
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/applications/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setSelectedApplication(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createApplicationMutation.mutate(sanitizePayload(formData));
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedApplication) {
      updateApplicationMutation.mutate({ id: selectedApplication.id, payload: sanitizePayload(formData) });
    }
  };

  const openApplicationDetails = (app: Application) => {
    setSelectedApplication(app);
    setIsEditMode(false);
    updateApplicationMutation.reset();
    setFormData({
      candidate_id: app.candidate_id,
      job_title: app.job_title,
      company: app.company,
      status: app.status,
      applied_at: app.applied_at.split('T')[0],
      salary_expectation: app.salary_expectation?.toString() || '',
      source: app.source || '',
      notes: app.notes || '',
    });
  };

  const handleDelete = () => {
    if (selectedApplication && window.confirm("Are you sure you want to delete this application?")) {
      deleteApplicationMutation.mutate(selectedApplication.id);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Applications</h2>
          <p className="text-slate-500 mt-1">Review and manage job applications</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ candidate_id: '', job_title: '', company: '', status: 'applied', applied_at: new Date().toLocaleDateString('en-CA'), salary_expectation: '', source: '', notes: '' });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add Application</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by candidate, role, company..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From Date"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="To Date"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-red-600">
            Failed to load applications. Please check your connection.
          </div>
        )}

        {!isLoading && !isError && applications && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No applications found</h3>
            <p className="text-slate-500">
              {debouncedSearchTerm ? 'Try adjusting your search terms.' : 'There are no applications in the system yet.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && applications && applications.length > 0 && (
          <div className="flex flex-col">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Candidate</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Role</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-sm hidden md:table-cell">Applied Date</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link 
                        to={`/candidates?candidate_id=${app.candidate_id}`} 
                        className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {app.candidate_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building size={16} className="text-slate-400" />
                        {app.job_title} <span className="text-slate-400 text-sm font-normal">at {app.company}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                          statusColors[app.status] || statusColors.applied
                        } capitalize`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(app.applied_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openApplicationDetails(app)}
                        className="text-indigo-600 font-medium text-sm hover:text-indigo-800 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-slate-200 mt-auto">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-700">
                  Page <span className="font-medium">{meta.page}</span> of <span className="font-medium">{meta.totalPages}</span>
                </span>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Details / Edit Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {isEditMode ? 'Edit Application' : selectedApplication.candidate_name}
                </h3>
                {!isEditMode && (
                  <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                    <Building size={14} /> {selectedApplication.job_title} at {selectedApplication.company}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedApplication(null)}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                {!isEditMode && selectedApplication.candidate_email && (
                  <Link 
                    to={`/candidates?candidate_id=${selectedApplication.candidate_id}`}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm font-medium transition-colors"
                  >
                    {selectedApplication.candidate_email}
                  </Link>
                )}
              </div>
            </div>
            
            <form onSubmit={handleUpdateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {isEditMode && updateApplicationMutation.isError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {((updateApplicationMutation.error as ApiError)?.response?.data?.error || 
                     (updateApplicationMutation.error as ApiError)?.response?.data?.message || 
                     "Failed to update application. Please check the fields and try again.")}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Candidate</label>
                    {!isEditMode ? (
                      <div className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 transition-all flex items-center">
                        <Link 
                          to={`/candidates?candidate_id=${selectedApplication.candidate_id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                        >
                          {selectedApplication.candidate_name}
                        </Link>
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.candidate_id}
                        onChange={(e) => setFormData({...formData, candidate_id: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="" disabled>Select a candidate</option>
                        {candidates?.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                      <input 
                        required
                        type="text" 
                        disabled={!isEditMode}
                        value={formData.job_title}
                        onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-900 disabled:border-transparent transition-all"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                      <div className="relative">
                        {!isEditMode && <Building size={16} className="absolute left-3 top-3 text-slate-400" />}
                        <input 
                          required
                          type="text" 
                          disabled={!isEditMode}
                          value={formData.company}
                          onChange={(e) => setFormData({...formData, company: e.target.value})}
                          className={`w-full ${!isEditMode ? 'pl-9' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-900 disabled:border-transparent transition-all`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select
                        required
                        disabled={!isEditMode}
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white capitalize disabled:bg-slate-50 disabled:text-slate-900 disabled:border-transparent disabled:appearance-none transition-all`}
                      >
                        {Object.keys(statusColors).map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Applied Date</label>
                      <div className="relative">
                        {!isEditMode && <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />}
                        <input 
                          required
                          type="date" 
                          disabled={!isEditMode}
                          value={formData.applied_at}
                          onChange={(e) => setFormData({...formData, applied_at: e.target.value})}
                          className={`w-full ${!isEditMode ? 'pl-9' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-900 disabled:border-transparent transition-all`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Salary Expectation <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <div className="relative">
                        {!isEditMode && formData.salary_expectation && <span className="absolute left-3 top-2.5 text-slate-400 font-medium">$</span>}
                        <input 
                          type="number" 
                          disabled={!isEditMode}
                          value={formData.salary_expectation}
                          onChange={(e) => setFormData({...formData, salary_expectation: e.target.value})}
                          className={`w-full ${!isEditMode && formData.salary_expectation ? 'pl-7' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-900 disabled:border-transparent transition-all`}
                          placeholder={!isEditMode ? "Not specified" : "e.g. 120000"}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Source <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <input 
                        type="text" 
                        disabled={!isEditMode}
                        value={formData.source}
                        onChange={(e) => setFormData({...formData, source: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-900 disabled:border-transparent transition-all"
                        placeholder={!isEditMode ? "Not specified" : "e.g. LinkedIn"}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <div className="relative">
                      {!isEditMode && <FileText size={16} className="absolute left-3 top-3 text-slate-400" />}
                      <textarea 
                        disabled={!isEditMode}
                        value={isEditMode ? formData.notes : (formData.notes || 'No notes added.')}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={3}
                        className={`w-full ${!isEditMode ? 'pl-9' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:border-transparent resize-none transition-all`}
                        placeholder="Add some notes about this application..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteApplicationMutation.isPending}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg font-medium transition-colors"
                >
                  <Trash2 size={18} />
                  {isEditMode ? "" : "Delete"}
                </button>

                <div className="flex gap-2">
                  {!isEditMode ? (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Edit2 size={18} /> Edit
                    </button>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          openApplicationDetails(selectedApplication);
                        }}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={updateApplicationMutation.isPending}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        <Save size={18} /> Save
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Add New Application</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {createApplicationMutation.isError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {((createApplicationMutation.error as ApiError)?.response?.data?.error || 
                     (createApplicationMutation.error as ApiError)?.response?.data?.message || 
                     "Failed to create application. Please check the fields and try again.")}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Candidate</label>
                    <select
                      required
                      value={formData.candidate_id}
                      onChange={(e) => setFormData({...formData, candidate_id: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="" disabled>Select a candidate</option>
                      {candidates?.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                      <input 
                        required
                        type="text" 
                        value={formData.job_title}
                        onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                      <input 
                        required
                        type="text" 
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white capitalize"
                      >
                        {Object.keys(statusColors).map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Applied Date</label>
                      <input 
                        required
                        type="date" 
                        value={formData.applied_at}
                        onChange={(e) => setFormData({...formData, applied_at: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Salary Expectation <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <input 
                        type="number" 
                        value={formData.salary_expectation}
                        onChange={(e) => setFormData({...formData, salary_expectation: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 120000"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Source <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <input 
                        type="text" 
                        value={formData.source}
                        onChange={(e) => setFormData({...formData, source: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. LinkedIn"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <textarea 
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                      placeholder="Add any relevant notes..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex gap-3 bg-white shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createApplicationMutation.isPending || !formData.candidate_id}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center"
                >
                  {createApplicationMutation.isPending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    "Save Application"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

