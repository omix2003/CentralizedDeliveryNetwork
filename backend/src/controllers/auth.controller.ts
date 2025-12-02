import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import fs from 'fs';

export const authController = {
  async register(req:Request, res:Response, next:NextFunction){
    try{
      const {name, email, phone, password, role} = req.body;
      const user= await authService.register({
        name,
        email,
        phone,
        password,
        role,
      });
      const token = jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        agentId: user.agentId,
        partnerId: user.partnerId,
      },
      process.env.JWT_SECRET || 'djfhfudfhcnuyedufcy5482dfdf',
      {expiresIn: '7d'}    
    );
    res.status(201).json({
      user: {
        id:user.id,
        email:user.email,
        name:user.name,
        role:user.role,
        agentId:user.agentId,
        partnerId:user.partnerId,
      },
      token,
    });
    }catch (error){
      next(error);
    }
  },


  
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await authService.login({ email, password });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          agentId: user.agentId,
          partnerId: user.partnerId,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agentId: user.agentId,
          partnerId: user.partnerId,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  },

  
  async getMe(req: Request, res: Response, next: NextFunction){
    try{
      if(!req.user){
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await prisma.user.findUnique({
        where:{ id:req.user.id},
        include:{
          agent:true,
          partner: true,
          notifications:true
        },
      });
      if(!user){
        return res.status(404).json({error:'User not found'});
      }
      res.json({
        id: user.id,
        email:user.email,
        name:user.name,
        role:user.role,
        agentId: user.agent?.id,
        partnerId: user.partner?.id,
        agent: user.agent ?{
          status: user.agent.status,
          vehicleType:user.agent.vehicleType,
          isApproved: user.agent.isApproved,
          rating: user.agent.rating,
        } : null,
        partner:user.partner ?{
          companyName: user.partner.companyName,
          isActive:user.partner.isActive,
        } : null,
      });
    }catch(error){
      next(error);
    }
  },

  // POST /api/auth/profile-picture - Upload profile picture
  async uploadProfilePicture(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Generate file URL (relative to /uploads/profiles/)
      const fileUrl = `/uploads/profiles/${req.file.filename}`;

      // Update user profile picture
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { profilePicture: fileUrl },
        select: {
          id: true,
          profilePicture: true,
        },
      });

      res.json({
        url: fileUrl,
        message: 'Profile picture uploaded successfully',
      });
    } catch (error) {
      // Clean up uploaded file if there's an error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      next(error);
    }
  },

};


