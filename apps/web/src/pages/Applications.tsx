import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Edit2, Save, FileText, Calendar, Building, Filter, Plus, X, Trash2 } from 'lucide-react';
import { ApplicationSchema, CandidateSchema } from '@candidate-tracker/shared';
import { z } from 'zod';
import apiClient from '../api/client';

// The API returns the Application with the candidate_name injected
type Application = z.infer<typeof ApplicationSchema> & {
  id: string;
  candidate_name: string;
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
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  
  const [formData, setFormData] = useState({
    candidate_id: '',
    job_title: '',
    company: '',
    status: 'applied',
    applied_at: new Date().toISOString().split('T')[0],
    salary_expectation: '',
    source: '',
    notes: '',
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // Debounce the search term to avoid spamming the API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400); // 400ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch applications with the debounced search term
  const { data: applications, isLoading, isError } = useQuery<Application[]>({
    queryKey: ['applications', debouncedSearchTerm],
    queryFn: async () => {
      const response = await apiClient.get('/applications', {
        params: { search: debouncedSearchTerm || undefined },
      });
      return response.data;
    },
  });

  // Fetch candidates for the dropdown in the modal
  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ['candidates'],
    queryFn: async () => {
      const response = await apiClient.get('/candidates');
      return response.data;
    },
    enabled: isModalOpen,
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
      setFormData({ candidate_id: '', job_title: '', company: '', status: 'applied', applied_at: new Date().toISOString().split('T')[0], salary_expectation: '', source: '', notes: '' });
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
      // Wait, we need to inject candidate_name back since the PUT response doesn't return the JOINed candidate_name.
      // But we can just use the previous selectedApplication's candidate_name.
      if (selectedApplication) {
        setSelectedApplication({
          ...updatedApp,
          candidate_name: selectedApplication.candidate_name,
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
    setFormData({
      candidate_id: app.candidate_id,
      job_title: app.job_title,
      company: app.company,
      status: app.status,
      applied_at: new Date(app.applied_at).toISOString().split('T')[0],
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
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add Application</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by candidate name or status..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">
          <Filter size={20} />
          <span>Filters</span>
        </button>
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
                      to={`/candidates?id=${app.candidate_id}`} 
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
                      onClick={() => setSelectedApplication(app)}
                      className="text-indigo-600 font-medium text-sm hover:text-indigo-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <button 
                    onClick={() => setIsEditMode(true)}
                    className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors flex items-center gap-2"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedApplication(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {isEditMode ? (
              <form onSubmit={handleUpdateSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  {updateApplicationMutation.isError && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                      {((updateApplicationMutation.error as any)?.response?.data?.error || 
                       (updateApplicationMutation.error as any)?.response?.data?.message || 
                       "Failed to update application. Please check the fields and try again.")}
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
                        {candidates?.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
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
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Source <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <input 
                          type="text" 
                          value={formData.source}
                          onChange={(e) => setFormData({...formData, source: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <textarea 
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 bg-white shrink-0">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      openApplicationDetails(selectedApplication);
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={updateApplicationMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Applied Date</span>
                      <div className="font-medium text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        {new Date(selectedApplication.applied_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Status</span>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border capitalize ${statusColors[selectedApplication.status]}`}>
                        {selectedApplication.status}
                      </span>
                    </div>
                    {selectedApplication.salary_expectation && (
                      <div>
                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Salary Expectation</span>
                        <div className="font-medium text-slate-800">
                          {selectedApplication.salary_expectation.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedApplication.source && (
                      <div>
                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Source</span>
                        <div className="font-medium text-slate-800">
                          {selectedApplication.source}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Application Notes</span>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-600 text-sm italic min-h-[100px]">
                      {selectedApplication.notes || "No notes have been added to this application yet."}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-between items-center shrink-0">
                  <button
                    onClick={handleDelete}
                    disabled={deleteApplicationMutation.isPending}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                  <button 
                    onClick={() => setSelectedApplication(null)}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
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
                    {((createApplicationMutation.error as any)?.response?.data?.error || 
                     (createApplicationMutation.error as any)?.response?.data?.message || 
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
                        <option key={c.id} value={c.id}>{c.name}</option>
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

