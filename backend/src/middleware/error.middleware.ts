import {Request, Response, NextFunction} from 'express';
import {AppError, formatError, ValidationError} from '../utils/errors.util';
import { Prisma } from '@prisma/client';

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

    // Handle Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma Error:', {
            code: err.code,
            message: err.message,
            meta: err.meta,
            url: req.url,
            method: req.method,
            stack: err.stack,
        });

        // Handle specific Prisma error codes
        if (err.code === 'P2002') {
            // Unique constraint violation
            return res.status(409).json({
                error: 'Conflict',
                message: 'A record with this value already exists',
                details: err.meta,
            });
        }
        
        if (err.code === 'P2025') {
            // Record not found
            return res.status(404).json({
                error: 'Not Found',
                message: 'The requested record was not found',
                details: err.meta,
            });
        }

        if (err.code === 'P2014') {
            // Required relation missing
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Required relation is missing',
                details: err.meta,
            });
        }

        if (err.code === 'P2003') {
            // Foreign key constraint failed
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Foreign key constraint failed',
                details: err.meta,
            });
        }

        // Generic Prisma error
        return res.status(500).json({
            error: 'Database Error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'A database error occurred',
            code: err.code,
            ...(process.env.NODE_ENV === 'development' && { details: err.meta, stack: err.stack }),
        });
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        console.error('Prisma Validation Error:', {
            message: err.message,
            url: req.url,
            method: req.method,
            stack: err.stack,
        });
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid data provided to database',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
        console.error('Prisma Initialization Error:', {
            message: err.message,
            errorCode: err.errorCode,
            url: req.url,
            method: req.method,
            stack: err.stack,
        });
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database connection failed. Please try again later.',
            ...(process.env.NODE_ENV === 'development' && { details: err.message }),
        });
    }

    // Log all errors with full context
    console.error('Error:', {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        statusCode: err instanceof AppError ? err.statusCode : undefined,
        url: req.url,
        method: req.method,
        stack: err?.stack,
        body: req.body,
        params: req.params,
        query: req.query,
    });

    const errorResponse= formatError(err);
    const statusCode= err instanceof AppError ? err.statusCode : 500;
    res.status(statusCode).json(errorResponse);
};