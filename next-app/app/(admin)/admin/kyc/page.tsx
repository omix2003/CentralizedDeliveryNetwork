'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Download,
  UserCheck,
  Search
} from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  verified: boolean;
  uploadedAt: string;
}

interface Agent {
  id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  documents: Document[];
  kycStatus: {
    verifiedCount: number;
    pendingCount: number;
    totalCount: number;
    missingTypes: string[];
    isComplete: boolean;
  };
}

export default function KYCVerificationPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchPendingKYC();
  }, [page]);

  async function fetchPendingKYC() {
    try {
      setLoading(true);
      const data = await adminApi.getPendingKYC({ page, limit: 20 });
      setAgents(data.agents);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to fetch pending KYC:', err);
      setError(err.message || 'Failed to load pending KYC');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyDocument(documentId: string) {
    try {
      await adminApi.verifyDocument(documentId);
      alert('Document verified successfully');
      fetchPendingKYC();
      if (selectedAgent) {
        const updatedDocs = await adminApi.getAgentDocuments(selectedAgent.id);
        setSelectedAgent({
          ...selectedAgent,
          documents: updatedDocs.documents,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to verify document');
    }
  }

  async function handleRejectDocument(documentId: string) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      await adminApi.rejectDocument(documentId, reason);
      alert('Document rejected');
      fetchPendingKYC();
      if (selectedAgent) {
        const updatedDocs = await adminApi.getAgentDocuments(selectedAgent.id);
        setSelectedAgent({
          ...selectedAgent,
          documents: updatedDocs.documents,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject document');
    }
  }

  async function handleVerifyAll(agentId: string) {
    if (!confirm('Verify all documents and approve this agent?')) return;
    
    try {
      await adminApi.verifyAgentKYC(agentId);
      alert('Agent KYC verified and approved');
      fetchPendingKYC();
      setSelectedAgent(null);
    } catch (err: any) {
      alert(err.message || 'Failed to verify KYC');
    }
  }

  async function handleViewAgent(agent: Agent) {
    try {
      const data = await adminApi.getAgentDocuments(agent.id);
      setSelectedAgent({
        ...agent,
        documents: data.documents,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to load agent documents');
    }
  }

  const filteredAgents = agents.filter((agent) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.user.name.toLowerCase().includes(query) ||
      agent.user.email.toLowerCase().includes(query) ||
      agent.user.phone.includes(query)
    );
  });

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LICENSE: 'Driving License',
      VEHICLE_REG: 'Vehicle Registration',
      ID_PROOF: 'ID Proof',
      ADDRESS_PROOF: 'Address Proof',
    };
    return labels[type] || type;
  };

  const getDocumentUrl = (fileUrl: string) => {
    // If it's already a full URL, return as is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Otherwise, prepend the backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${backendUrl}${fileUrl}`;
  };

  const handleViewDocument = (doc: Document) => {
    setViewingDocument(doc);
  };

  if (loading && agents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-600">Review and verify agent documents</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton variant="text" width="200px" />
                <Skeleton variant="text" width="150px" className="mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
          <p className="text-gray-600">Review and verify agent documents</p>
        </div>
        <div className="text-sm text-gray-600">
          {agents.length} agent(s) pending verification
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredAgents.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  No Pending KYC Verifications
                </p>
                <p className="text-gray-600">
                  All agents have been verified or no agents are pending verification.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedAgent?.id === agent.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleViewAgent(agent)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{agent.user.name}</h3>
                      <p className="text-sm text-gray-600">{agent.user.email}</p>
                      <p className="text-sm text-gray-600">{agent.user.phone}</p>
                    </div>
                    <div className="text-right">
                      {agent.kycStatus.isComplete ? (
                        <Badge variant="success" className="mb-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="mb-2">
                          <Clock className="h-3 w-3 mr-1" />
                          Incomplete
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Documents Status</span>
                      <span className="font-medium">
                        {agent.kycStatus.verifiedCount} / {agent.kycStatus.totalCount} verified
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(agent.kycStatus.verifiedCount / agent.kycStatus.totalCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {agent.kycStatus.missingTypes.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-yellow-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Missing: {agent.kycStatus.missingTypes.join(', ')}</span>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAgent(agent);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Documents
                    </Button>
                    {agent.kycStatus.isComplete && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifyAll(agent.id);
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Verify All
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Document Viewer */}
        {selectedAgent && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Documents</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAgent(null)}
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAgent.documents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No documents uploaded
                  </p>
                ) : (
                  selectedAgent.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg ${
                        selectedDocument?.id === doc.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">
                            {getDocumentTypeLabel(doc.documentType)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {doc.verified ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {/* Primary Action: View Document */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="premium"
                            onClick={() => handleViewDocument(doc)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Document
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const url = getDocumentUrl(doc.fileUrl);
                              window.open(url, '_blank');
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                        {/* Verification Actions - Only show if not verified */}
                        {!doc.verified && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleVerifyDocument(doc.id)}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDocument(doc.id)}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">
                  {getDocumentTypeLabel(viewingDocument.documentType)}
                </h3>
                <p className="text-sm text-gray-500">{viewingDocument.fileName}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingDocument(null)}
              >
                ×
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
              {viewingDocument.fileUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getDocumentUrl(viewingDocument.fileUrl)}
                  className="w-full h-full min-h-[600px] border-0"
                  title={viewingDocument.fileName}
                />
              ) : (
                <img
                  src={getDocumentUrl(viewingDocument.fileUrl)}
                  alt={viewingDocument.fileName}
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const errorDiv = target.nextElementSibling as HTMLElement;
                    if (errorDiv) errorDiv.style.display = 'flex';
                  }}
                />
              )}
              <div className="hidden flex-col items-center justify-center text-gray-500 p-8">
                <FileText className="h-16 w-16 mb-4 text-gray-400" />
                <p className="text-lg font-medium">Unable to display document</p>
                <p className="text-sm mt-2">Please download to view</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    const url = getDocumentUrl(viewingDocument.fileUrl);
                    window.open(url, '_blank');
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-between">
              <div className="flex gap-2">
                {!viewingDocument.verified && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => {
                        handleVerifyDocument(viewingDocument.id);
                        setViewingDocument(null);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        handleRejectDocument(viewingDocument.id);
                        setViewingDocument(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const url = getDocumentUrl(viewingDocument.fileUrl);
                  window.open(url, '_blank');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



