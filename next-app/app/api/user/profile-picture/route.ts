import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only images (JPEG, PNG, WebP, GIF) are allowed.' }, { status: 400 });
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${session.user.id}-${Date.now()}${path.extname(file.name)}`;

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (mkdirError: any) {
            console.error('Error creating upload directory:', mkdirError);
            return NextResponse.json({ error: 'Failed to create upload directory' }, { status: 500 });
        }

        const filepath = path.join(uploadDir, filename);
        try {
            await writeFile(filepath, buffer);
        } catch (writeError: any) {
            console.error('Error writing file:', writeError);
            return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
        }

        const fileUrl = `/uploads/profiles/${filename}`;

        // Update user profile
        try {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { profilePicture: fileUrl },
            });
        } catch (dbError: any) {
            console.error('Error updating user profile:', dbError);
            // If database update fails, try to delete the uploaded file
            try {
                const fs = await import('fs/promises');
                await fs.unlink(filepath);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file after DB failure:', unlinkError);
            }
            return NextResponse.json({ error: 'Failed to update profile picture in database' }, { status: 500 });
        }

        return NextResponse.json({ url: fileUrl });
    } catch (error: any) {
        console.error('Error uploading profile picture:', error);
        const errorMessage = error?.message || 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
