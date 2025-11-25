import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

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
  }

};


