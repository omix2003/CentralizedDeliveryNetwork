'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Search, Building2, CheckCircle, XCircle, ExternalLink, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminApi, Partner } from '@/lib/api/admin';

export default function PartnersManagementPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, [page, activeFilter, searchQuery]);

  async function fetchPartners() {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getPartners({
        search: searchQuery || undefined,
        isActive: activeFilter === 'ACTIVE' ? true : activeFilter === 'INACTIVE' ? false : undefined,
        page,
        limit: 20,
      });
      setPartners(response.partners);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch partners:', err);
      setError(err.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePartner(partnerId: string, companyName: string) {
    const confirmMessage = `Are you sure you want to delete "${companyName}"?\n\nThis will permanently delete:\n- The partner account\n- All associated orders\n- All associated data\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingId(partnerId);
      await adminApi.deletePartner(partnerId);
      // Refresh the list
      await fetchPartners();
    } catch (err: any) {
      console.error('Failed to delete partner:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete partner';
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && partners.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading partners...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partners Management</h1>
        <p className="text-gray-600">Manage and monitor all delivery partners</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Active Filter */}
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Partners</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partners List ({partners.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error: {error}</p>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No partners found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Company</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Contact</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Orders</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((partner) => (
                      <tr key={partner.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => router.push(`/admin/partners/${partner.id}`)}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-3"
                          >
                            <div className="relative">
                              {partner.user.profilePicture ? (
                                <img
                                  src={partner.user.profilePicture.startsWith('http') ? partner.user.profilePicture : `http://localhost:5000${partner.user.profilePicture}`}
                                  alt={partner.companyName}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-semibold text-sm ${partner.user.profilePicture ? 'hidden' : 'flex'}`}
                              >
                                <Building2 className="h-5 w-5" />
                              </div>
                            </div>
                            <span>{partner.companyName}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {partner.user.profilePicture ? (
                                <img
                                  src={partner.user.profilePicture.startsWith('http') ? partner.user.profilePicture : `http://localhost:5000${partner.user.profilePicture}`}
                                  alt={partner.user.name}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs ${partner.user.profilePicture ? 'hidden' : 'flex'}`}
                              >
                                {partner.user.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <span>{partner.user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{partner.user.email}</td>
                        <td className="py-3 px-4 text-gray-600">{partner.user.phone}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {partner._count?.orders || 0}
                        </td>
                        <td className="py-3 px-4">
                          {partner.isActive ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/admin/partners/${partner.id}`)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePartner(partner.id, partner.companyName)}
                              disabled={deletingId === partner.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

