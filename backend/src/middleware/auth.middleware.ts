import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors.util';

declare global{
    namespace Express{
        interface Request{
            user?:{
                id: string;
                email: string;
                role: string;
                agentId?: string;
                partnerId?: string;
            
            };
        }
    }
}

export const authenticate =(
    req:Request,
    res:Response,
    next:NextFunction
) =>{
    try{
        // Express lowercases header names, so 'authorization' is correct
        const authHeader = req.headers.authorization || req.headers['authorization'];
        console.log('[AUTH MIDDLEWARE] Checking auth:', {
            hasHeader: !!authHeader,
            headerValue: authHeader ? authHeader.substring(0, 30) + '...' : 'none',
            headerType: typeof authHeader,
            allAuthHeaders: Object.keys(req.headers).filter(k => k.toLowerCase().includes('auth')),
            url: req.url,
            path: req.path,
            method: req.method
        });
        
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            console.log('[AUTH MIDDLEWARE] No valid token found');
            next(new UnauthorizedError('No token provided'));
            return;
    }
    const token = authHeader.substring(7);
    const decoded =jwt.verify(
        token,
        process.env.JWT_SECRET || 'djfhfudfhcnuyedufcy5482dfdf',
    ) as{
        id: string;
        email: string;
        role:string;
        agentId?:string;
        partnerId?:string;
    };
    req.user= decoded;

    next();
}
catch(error){
    if(error instanceof jwt.JsonWebTokenError){
        next(new UnauthorizedError('Invalid token'));
        return;
    }
    if(error instanceof jwt.TokenExpiredError){
        next(new UnauthorizedError('Token expired'));
        return;
    }
    next(error);
}
};
