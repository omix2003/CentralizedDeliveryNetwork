import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { ConflictError } from '../utils/errors.util';


export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agentId?: string;
  partnerId?: string;
}

export const authService = {

    async register(data: RegisterData): Promise<AuthUser>{
      const existingUser = await prisma.user.findUnique({
        where: {email:data.email},
    });
    if(existingUser){
      throw new ConflictError('User with this email already exists');
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingPhone) {
      throw new ConflictError('User with this phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role,
        emailVerified: data.role === UserRole.ADMIN ? new Date() : null,
        phoneVerified: false,
      },
      include: {
        agent: true,
        partner: true,
      },
    });

    // Create role-specific records if needed
    if (data.role === UserRole.PARTNER) {
      // Generate API key
      const apiKey = `pk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      await prisma.partner.create({
        data: {
          userId: user.id,
          companyName: data.name, // Can be updated later
          apiKey,
          isActive: true,
        },
      });
    } else if (data.role === UserRole.AGENT) {
      // Create agent record with default vehicleType (BIKE)
      // Agent can update vehicleType later via profile update endpoint
      await prisma.agent.create({
        data: {
          userId: user.id,
          vehicleType: 'BIKE', // Default, can be updated later
          status: 'OFFLINE',
          isApproved: false, // Requires admin approval
          isBlocked: false,
        },
      });
    }

    // Fetch user with relations
    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        agent: true,
        partner: true,
      },
    });

    if (!userWithRelations) {
      throw new Error('Failed to create user');
    }

    return {
      id: userWithRelations.id,
      email: userWithRelations.email,
      name: userWithRelations.name,
      role: userWithRelations.role,
      agentId: userWithRelations.agent?.id,
      partnerId: userWithRelations.partner?.id,
    };
  },


  async login(credentials: LoginCredentials): Promise<AuthUser | null> {
    // Find user with relations
    const user = await prisma.user.findUnique({
      where: {
        email: credentials.email,
      },
      include: {
        agent: true,
        partner: true,
      },
    });

    if (!user) {
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agentId: user.agent?.id,
      partnerId: user.partner?.id,
    };
  },
};


