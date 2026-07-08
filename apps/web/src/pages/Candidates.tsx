import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreVertical, MapPin, Mail, Briefcase, Users, X, Trash2, Edit2, Save, Phone, Link as LinkIcon, FileText } from 'lucide-react';
import { CandidateSchema } from '@candidate-tracker/shared';
import { z } from 'zod';
import apiClient from '../api/client';

// We extend the schema with the generated fields (id, timestamps)
type Candidate = z.infer<typeof CandidateSchema> & { id: string; created_at: string; updated_at: string };

export default function Candidates() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    location: '',
    phone: '',
    linkedin_url: '',
    notes: ''
  });

  const { data: candidates, isLoading, isError } = useQuery<Candidate[]>({
    queryKey: ['candidates'],
    queryFn: async () => {
      const response = await apiClient.get('/candidates');
      return response.data;
    },
  });

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && candidates && !selectedCandidate) {
      const candidate = candidates.find(c => c.id === id);
      if (candidate) {
        openCandidateDetails(candidate);
        // Clear the search param from the URL without reloading
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, candidates, selectedCandidate, setSearchParams]);

  const sanitizePayload = (data: typeof formData) => {
    return {
      name: data.name?.trim() || '',
      email: data.email?.trim() || '',
      location: data.location?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      linkedin_url: data.linkedin_url?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    };
  };

  const createCandidateMutation = useMutation({
    mutationFn: async (newCandidate: ReturnType<typeof sanitizePayload>) => {
      const response = await apiClient.post('/candidates', newCandidate);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', location: '', phone: '', linkedin_url: '', notes: '' });
    },
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async (data: { id: string, payload: ReturnType<typeof sanitizePayload> }) => {
      const response = await apiClient.put(`/candidates/${data.id}`, data.payload);
      return response.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setIsEditMode(false);
      setSelectedCandidate(updated);
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/candidates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setSelectedCandidate(null);
    },
    onError: (error) => {
      console.error("Delete candidate error:", error);
      alert("Failed to delete candidate: " + (error as any).message);
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCandidateMutation.mutate(sanitizePayload(formData));
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCandidate) {
      updateCandidateMutation.mutate({ id: selectedCandidate.id, payload: sanitizePayload(formData) });
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent modal click
    if (selectedCandidate && window.confirm("Are you sure you want to delete this candidate?")) {
      deleteCandidateMutation.mutate(selectedCandidate.id);
    }
  };

  const openCandidateDetails = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsEditMode(false);
    setFormData({
      name: candidate.name,
      email: candidate.email,
      location: candidate.location || '',
      phone: candidate.phone || '',
      linkedin_url: candidate.linkedin_url || '',
      notes: candidate.notes || '',
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full relative">
      {/* Header section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Candidates</h2>
          <p className="text-slate-500 mt-1">Manage and track all your applicants</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: '', email: '', location: '', phone: '', linkedin_url: '', notes: '' });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add Candidate</span>
        </button>
      </div>

      {/* Controls & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search candidates by name, email, or role..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <select className="bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
          <option>All Statuses</option>
          <option>Active</option>
          <option>Hired</option>
          <option>Rejected</option>
        </select>
      </div>

      {/* Candidates List / Grid */}
      <div className="flex-1 overflow-auto min-h-[400px]">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {isError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
            Failed to load candidates. Please try again.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {candidates?.map((candidate) => (
              <div
                key={candidate.id}
                onClick={() => openCandidateDetails(candidate)}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all group flex items-start justify-between cursor-pointer"
              >
                <div className="flex gap-4">
                  {/* Avatar Placeholder */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner uppercase shrink-0">
                    {candidate.name.substring(0, 2)}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                      {candidate.name}
                    </h3>
                    <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Mail size={14} />
                        <span>{candidate.email}</span>
                      </div>
                      {candidate.location && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <MapPin size={14} />
                          <span>{candidate.location}</span>
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Phone size={14} />
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between h-full">
                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                    <MoreVertical size={20} />
                  </button>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1">
                      <Briefcase size={12} />
                      Applied
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {candidates?.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-200 rounded-xl border-dashed">
                <Users className="text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No candidates found</h3>
                <p className="text-slate-500">There are no candidates in the system right now.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Candidate Details / Edit Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">
                {isEditMode ? "Edit Candidate" : "Candidate Details"}
              </h3>
              <button 
                onClick={() => {
                  setSelectedCandidate(null);
                  setIsEditMode(false);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={isEditMode ? handleUpdateSubmit : (e) => e.preventDefault()} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {updateCandidateMutation.isError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {((updateCandidateMutation.error as any)?.response?.data?.error || 
                     (updateCandidateMutation.error as any)?.response?.data?.message || 
                     "Failed to update candidate.")}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={isEditMode ? formData.name : selectedCandidate.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      disabled={!isEditMode}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-700 font-medium"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={isEditMode ? formData.email : selectedCandidate.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditMode}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-700"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      {!isEditMode && <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                      <input 
                        type="text" 
                        value={isEditMode ? formData.phone : (selectedCandidate.phone || 'Not provided')}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        disabled={!isEditMode}
                        className={`w-full ${!isEditMode ? 'pl-9' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:border-transparent`}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Location <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      {!isEditMode && <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                      <input 
                        type="text" 
                        value={isEditMode ? formData.location : (selectedCandidate.location || 'Not provided')}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        disabled={!isEditMode}
                        className={`w-full ${!isEditMode ? 'pl-9' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:border-transparent`}
                        placeholder="e.g. New York, NY"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      LinkedIn URL <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative flex items-center">
                      {!isEditMode && <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                      <input 
                        type="url" 
                        value={isEditMode ? formData.linkedin_url : (selectedCandidate.linkedin_url || 'Not provided')}
                        onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                        disabled={!isEditMode}
                        className={`w-full ${!isEditMode ? 'pl-9' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:border-transparent`}
                        placeholder="https://linkedin.com/in/username"
                      />
                      {!isEditMode && selectedCandidate.linkedin_url && (
                        <a 
                          href={selectedCandidate.linkedin_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium shrink-0"
                        >
                          Open Profile
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      {!isEditMode && <FileText size={16} className="absolute left-3 top-3 text-slate-400" />}
                      <textarea 
                        value={isEditMode ? formData.notes : (selectedCandidate.notes || 'No notes added.')}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        disabled={!isEditMode}
                        rows={3}
                        className={`w-full ${!isEditMode ? 'pl-9' : 'px-4'} py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-600 disabled:border-transparent resize-none`}
                        placeholder="Add some notes about this candidate..."
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteCandidateMutation.isPending}
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
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Edit2 size={18} /> Edit
                    </button>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          setFormData({
                            name: selectedCandidate.name,
                            email: selectedCandidate.email,
                            location: selectedCandidate.location || '',
                            phone: selectedCandidate.phone || '',
                            linkedin_url: selectedCandidate.linkedin_url || '',
                            notes: selectedCandidate.notes || '',
                          });
                        }}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={updateCandidateMutation.isPending}
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

      {/* Add Candidate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Add New Candidate</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {createCandidateMutation.isError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {((createCandidateMutation.error as any)?.response?.data?.error || 
                     (createCandidateMutation.error as any)?.response?.data?.message || 
                     "Failed to add candidate. Please check the fields and try again.")}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Location <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      LinkedIn URL <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input 
                      type="url" 
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://linkedin.com/in/janedoe"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea 
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Add any initial notes about this candidate..."
                    />
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
                  disabled={createCandidateMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex justify-center items-center"
                >
                  {createCandidateMutation.isPending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    "Save Candidate"
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
