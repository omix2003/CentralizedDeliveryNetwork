import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import {validate} from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { loginSchema } from '../utils/validation.schemas';
import { registerSchema } from '../utils/validation.schemas';
const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.get('/me', authenticate, authController.getMe);

// Debug: Log registered routes
console.log('🔐 Auth routes registered:');
console.log('  POST /api/auth/login');
console.log('  POST /api/auth/register');
console.log('  GET /api/auth/me');

export default router;


