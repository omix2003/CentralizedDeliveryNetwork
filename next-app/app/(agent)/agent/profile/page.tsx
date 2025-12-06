'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { agentApi, AgentProfile, AgentDocument } from '@/lib/api/agent';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User,
  MapPin,
  Car,
  Star,
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ProfilePictureUpload } from '@/components/user/ProfilePictureUpload';
import { ratingApi, AgentRating } from '@/lib/api/rating';
import { format } from 'date-fns';

const DOCUMENT_TYPES = [
  { value: 'LICENSE', label: 'Driving License', required: true },
  { value: 'VEHICLE_REG', label: 'Vehicle Registration', required: true },
  { value: 'ID_PROOF', label: 'ID Proof (Aadhaar/PAN)', required: true },
] as const;

export default function AgentProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    city: '',
    state: '',
    pincode: '',
    vehicleType: 'BIKE' as 'BIKE' | 'SCOOTER' | 'CAR' | 'BICYCLE',
    payoutPlan: 'WEEKLY' as 'WEEKLY' | 'MONTHLY',
  });
  const [ratings, setRatings] = useState<AgentRating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsTotal, setRatingsTotal] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadRatings();
    }
  }, [profile?.id, ratingsPage]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentApi.getProfile();
      setProfile(data);
      setFormData({
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        vehicleType: (data.vehicleType as any) || 'BIKE',
        payoutPlan: data.payoutPlan || 'WEEKLY',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, WebP) and PDF files are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(documentType);
      setError(null);
      setSuccess(null);

      const document = await agentApi.uploadDocument(file, documentType);

      // Update profile with new document
      if (profile) {
        const existingDocuments = profile.documents || [];
        setProfile({
          ...profile,
          documents: [
            ...existingDocuments.filter(d => d.documentType !== documentType),
            document,
          ],
        });
      }

      setSuccess(`${DOCUMENT_TYPES.find(d => d.value === documentType)?.label} uploaded successfully`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      setError(null);
      await agentApi.deleteDocument(documentId);

      if (profile) {
        const existingDocuments = profile.documents || [];
        setProfile({
          ...profile,
          documents: existingDocuments.filter(d => d.id !== documentId),
        });
      }

      setSuccess('Document deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setError(null);
      setSuccess(null);
      const updated = await agentApi.updateProfile(formData);
      setProfile(updated);
      setEditing(false);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const getDocumentStatus = (docType: string) => {
    const documents = profile?.documents || [];
    const doc = documents.find(d => d.documentType === docType);
    if (!doc) return { uploaded: false, verified: false };
    return { uploaded: true, verified: doc.verified };
  };

  const loadRatings = async () => {
    if (!profile?.id) return;
    
    try {
      setRatingsLoading(true);
      const response = await ratingApi.getAgentRatings(profile.id, {
        page: ratingsPage,
        limit: 10,
      });
      setRatings(response.ratings);
      setRatingsTotal(response.pagination.total);
    } catch (err: any) {
      console.error('Failed to load ratings:', err);
    } finally {
      setRatingsLoading(false);
    }
  };

  const getKYCStatus = () => {
    if (!profile) return { status: 'pending', message: 'Loading...' };

    const documents = profile.documents || [];

    const allRequired = DOCUMENT_TYPES.filter(d => d.required).every(d => {
      const doc = documents.find(doc => doc.documentType === d.value);
      return doc && doc.verified;
    });

    if (allRequired && profile.isApproved) {
      return { status: 'approved', message: 'KYC Verified' };
    }

    const allUploaded = DOCUMENT_TYPES.filter(d => d.required).every(d => {
      return documents.some(doc => doc.documentType === d.value);
    });

    if (allUploaded) {
      return { status: 'pending', message: 'Documents uploaded, awaiting verification' };
    }

    return { status: 'incomplete', message: 'Please upload all required documents' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load profile</p>
      </div>
    );
  }

  const kycStatus = getKYCStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your profile and documents</p>
      </div>

      {/* KYC Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            KYC Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{kycStatus.message}</p>
            </div>
            <Badge
              variant={
                kycStatus.status === 'approved' ? 'success' :
                  kycStatus.status === 'pending' ? 'warning' :
                    'danger'
              }
            >
              {kycStatus.status === 'approved' ? 'Verified' :
                kycStatus.status === 'pending' ? 'Pending' :
                  'Incomplete'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            {!editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex justify-center">
            <ProfilePictureUpload
              currentImageUrl={session?.user?.image}
              onUploadComplete={async (url) => {
                try {
                  // Force session update to get the new profile picture
                  await update();
                  // Small delay to ensure session is updated
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Refresh router to update any cached data
                  router.refresh();
                } catch (error) {
                  console.error('Error updating session:', error);
                  // Even if update fails, the image should still be visible from the upload
                }
              }}
            />
          </div>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="BIKE">Bike</option>
                    <option value="SCOOTER">Scooter</option>
                    <option value="CAR">Car</option>
                    <option value="BICYCLE">Bicycle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payout Plan
                  </label>
                  <select
                    value={formData.payoutPlan}
                    onChange={(e) => setFormData({ ...formData, payoutPlan: e.target.value as 'WEEKLY' | 'MONTHLY' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.payoutPlan === 'WEEKLY' 
                      ? 'You will receive payouts every Monday' 
                      : 'You will receive payouts on the 1st of each month'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile}>Save</Button>
                <Button variant="outline" onClick={() => {
                  setEditing(false);
                  setFormData({
                    city: profile.city || '',
                    state: profile.state || '',
                    pincode: profile.pincode || '',
                    vehicleType: (profile.vehicleType as any) || 'BIKE',
                    payoutPlan: profile.payoutPlan || 'WEEKLY',
                  });
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium">Name:</span>
                <span>{profile.user.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Email:</span>
                <span>{profile.user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Phone:</span>
                <span>{profile.user.phone}</span>
              </div>
              {profile.city && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{profile.city}, {profile.state} {profile.pincode}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <Car className="h-4 w-4 text-gray-400" />
                <span className="font-medium">Vehicle:</span>
                <span className="capitalize">{profile.vehicleType.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Payout Plan:</span>
                <Badge variant={profile.payoutPlan === 'WEEKLY' ? 'default' : 'secondary'}>
                  {profile.payoutPlan === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile.rating?.toFixed(1) || '0.0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed Orders</p>
              <p className="text-2xl font-bold text-gray-900">{profile.completedOrders ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Acceptance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{(profile.acceptanceRate ?? 0).toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DOCUMENT_TYPES.map((docType) => {
              const documents = profile.documents || [];
              const doc = documents.find(d => d.documentType === docType.value);
              const isUploading = uploading === docType.value;

              return (
                <div
                  key={docType.value}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{docType.label}</p>
                      {docType.required && (
                        <span className="text-xs text-red-600">Required</span>
                      )}
                    </div>
                    {doc && (
                      <div className="flex items-center gap-2">
                        {doc.verified ? (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-yellow-600">
                            <AlertCircle className="h-4 w-4" />
                            Pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {doc ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{doc.fileName}</span>
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <label className="block">
                        <input
                          type="file"
                          id={`file-upload-${docType.value}`}
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, docType.value);
                            }
                          }}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          className="w-full cursor-pointer"
                          onClick={() => document.getElementById(`file-upload-${docType.value}`)?.click()}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload {docType.label}
                            </>
                          )}
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ratings & Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Ratings & Reviews ({ratingsTotal})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ratingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Star className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No ratings yet</p>
              <p className="text-sm mt-1">Start delivering orders to receive ratings from partners</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= rating.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {rating.rating}.0
                        </span>
                      </div>
                      {rating.partner && (
                        <p className="text-sm text-gray-600 mb-1">
                          From {rating.partner.companyName || rating.partner.user?.name || 'Partner'}
                        </p>
                      )}
                      {rating.comment && (
                        <p className="text-sm text-gray-700 mt-2">{rating.comment}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {format(new Date(rating.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {ratingsTotal > 10 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Showing {((ratingsPage - 1) * 10) + 1} - {Math.min(ratingsPage * 10, ratingsTotal)} of {ratingsTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRatingsPage(p => Math.max(1, p - 1))}
                      disabled={ratingsPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRatingsPage(p => p + 1)}
                      disabled={ratingsPage * 10 >= ratingsTotal}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}


