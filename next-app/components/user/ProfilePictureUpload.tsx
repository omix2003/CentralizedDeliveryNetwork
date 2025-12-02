'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { authApi } from '@/lib/api/auth';
import { getImageUrl } from '@/lib/utils/imageUrl';

interface ProfilePictureUploadProps {
    currentImageUrl?: string | null;
    onUploadComplete?: (url: string) => void;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
    currentImageUrl,
    onUploadComplete,
}) => {
    // Track if we're currently uploading to prevent prop updates from resetting state
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isUploadingRef = useRef(false);

    // Helper to normalize image URL (handles both full URLs and relative paths)
    const normalizeImageUrl = useCallback((url: string | null | undefined): string | null => {
        if (!url) return null;
        // If already a full URL, return as is
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
            return url;
        }
        // Otherwise, convert relative path to full URL
        return getImageUrl(url);
    }, []);

    // Initialize preview URL from prop only on mount or when not uploading
    useEffect(() => {
        if (!isUploadingRef.current && currentImageUrl) {
            const imageUrl = normalizeImageUrl(currentImageUrl);
            setPreviewUrl(imageUrl);
            // Reset image error when URL changes
            setImageError(false);
            // If we have a current image and no uploaded URL, set uploaded URL too
            if (imageUrl && !uploadedUrl) {
                setUploadedUrl(imageUrl);
            }
            // Debug log (both dev and production for troubleshooting)
            console.log('[ProfilePictureUpload] Image URL initialized:', {
                currentImageUrl,
                normalized: imageUrl,
                nodeEnv: process.env.NODE_ENV,
            });
        } else if (!isUploadingRef.current && !currentImageUrl) {
            // Clear preview if no image URL
            setPreviewUrl(null);
            setImageError(false);
        }
    }, [currentImageUrl, normalizeImageUrl]);

    // Update uploadedUrl when currentImageUrl changes (after session refresh)
    useEffect(() => {
        if (currentImageUrl && !isUploadingRef.current) {
            const imageUrl = normalizeImageUrl(currentImageUrl);
            if (imageUrl) {
                setUploadedUrl(imageUrl);
            }
        }
    }, [currentImageUrl, normalizeImageUrl]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        // Create preview URL immediately
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        isUploadingRef.current = true;
        setIsUploading(true);

        try {
            // Upload the file
            const result = await authApi.uploadProfilePicture(file);
            
            // Construct full URL from the response
            const imageUrl = normalizeImageUrl(result.url) || result.url;
            
            // Update state with the new URL
            setPreviewUrl(imageUrl);
            setUploadedUrl(imageUrl);
            
            // Clean up the object URL
            URL.revokeObjectURL(objectUrl);
            
            // Call the callback if provided
            if (onUploadComplete) {
                onUploadComplete(imageUrl);
            }
        } catch (error: any) {
            console.error('Error uploading image:', error);
            const errorMessage = error?.message || 'Failed to upload profile picture. Please try again.';
            alert(errorMessage);
            
            // Revert to the last uploaded URL or current image URL
            const fallbackUrl = uploadedUrl || normalizeImageUrl(currentImageUrl);
            setPreviewUrl(fallbackUrl);
            
            // Clean up the object URL on error
            URL.revokeObjectURL(objectUrl);
        } finally {
            setIsUploading(false);
            isUploadingRef.current = false;
            
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [currentImageUrl, uploadedUrl, onUploadComplete, normalizeImageUrl]);

    // Determine what to display
    const displayUrl = previewUrl || normalizeImageUrl(currentImageUrl);
    
    // Check if URL is external (from backend server)
    const isExternalUrl = displayUrl ? (
        displayUrl.startsWith('http://') || 
        displayUrl.startsWith('https://') || 
        displayUrl.startsWith('blob:')
    ) : false;
    
    // For external URLs, always use regular img tag to avoid Next.js Image optimization issues
    // This is especially important in production where CORS and proxy issues can occur
    const useRegularImg = isExternalUrl && !displayUrl?.startsWith('blob:');

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 dark:bg-slate-800">
                    {displayUrl ? (
                        useRegularImg ? (
                            // Use regular img tag for external backend images (more reliable in production)
                            <img
                                src={displayUrl}
                                alt="Profile"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                    console.error('[ProfilePictureUpload] Image load error:', {
                                        src: displayUrl,
                                        error: e,
                                        url: displayUrl,
                                    });
                                    setImageError(true);
                                }}
                                onLoad={() => {
                                    // Reset error state on successful load
                                    setImageError(false);
                                }}
                            />
                        ) : (
                            // Use Next.js Image for blob URLs and relative paths
                            <Image
                                src={displayUrl}
                                alt="Profile"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                                unoptimized={true}
                                onError={(e) => {
                                    console.error('[ProfilePictureUpload] Image load error:', {
                                        src: displayUrl,
                                        error: e,
                                    });
                                    setImageError(true);
                                }}
                                onLoad={() => {
                                    setImageError(false);
                                }}
                            />
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Camera className="w-12 h-12" />
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploading}
                    aria-label="Upload profile picture"
                >
                    {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Camera className="w-5 h-5" />
                    )}
                </button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
                disabled={isUploading}
            />
            <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isUploading ? 'Uploading...' : 'Click the camera icon to update your photo'}
                </p>
            </div>
        </div>
    );
};
