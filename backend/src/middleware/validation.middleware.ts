import { Request, Response, NextFunction } from 'express';
import {z, ZodError} from 'zod';
import {ValidationError} from '../utils/errors.util';

export const validate = (schema: z.ZodSchema) => {
    return (req:Request, res:Response, next:NextFunction)=>{
        try{
            const validatedData =schema.parse(req.body);
            req.body =validatedData;
            next();
        }
        catch(error){
            if(error instanceof ZodError){
                const formattedErrors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                throw new ValidationError('Validation failed', formattedErrors);
            }
            next(error);
        }
};

};
