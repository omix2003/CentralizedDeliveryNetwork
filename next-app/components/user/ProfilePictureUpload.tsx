'use client';

import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { Camera, Loader2, Upload } from 'lucide-react';
import Image from 'next/image';

interface ProfilePictureUploadProps {
    currentImageUrl?: string | null;
    onUploadComplete?: (url: string) => void;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
    currentImageUrl,
    onUploadComplete,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        // Upload
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/user/profile-picture', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            if (onUploadComplete) {
                onUploadComplete(data.url);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload profile picture');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 dark:bg-slate-800">
                    {previewUrl ? (
                        <Image
                            src={previewUrl}
                            alt="Profile"
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Camera className="w-12 h-12" />
                        </div>
                    )}
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors"
                    disabled={isUploading}
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
            />
            <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Click the camera icon to update your photo
                </p>
            </div>
        </div>
    );
};
