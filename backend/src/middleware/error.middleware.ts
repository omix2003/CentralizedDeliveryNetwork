import {Request, Response, NextFunction} from 'express';
import {AppError, formatError, ValidationError} from '../utils/errors.util';

export const errorHandler=(
    err:any,
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    // Handle JSON parsing errors
    if (err instanceof SyntaxError && 'body' in err) {
        console.error('JSON Parse Error:', {
            message: err.message,
            url: req.url,
            method: req.method,
        });
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'The request body contains invalid JSON. Please check your JSON syntax (use double quotes, ensure proper commas, etc.)',
            details: err.message
        });
    }

    console.log('Error:',{
        message:err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    const errorResponse= formatError(err);
    const statusCode= err instanceof AppError ? err.statusCode : 500;
    res.status(statusCode).json(errorResponse);
};