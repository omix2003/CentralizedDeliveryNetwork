import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { adminController } from '../controllers/admin.controller';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Admin metrics
router.get('/metrics/overview', adminController.getOverview);

// Admin management
router.get('/agents', adminController.getAgents);

export default router;