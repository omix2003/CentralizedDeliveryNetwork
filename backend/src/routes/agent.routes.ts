import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAgent } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { agentController } from '../controllers/agent.controller';
import {
  updateLocationSchema,
  updateStatusSchema,
  agentProfileUpdateSchema,
} from '../utils/validation.schemas';

const router = Router();

// All routes require authentication and agent role
router.use(authenticate);
router.use(requireAgent);

// Agent profile routes
router.get('/profile', agentController.getProfile);
router.put('/profile', validate(agentProfileUpdateSchema), agentController.updateProfile);

// Agent location and status
router.post('/location', validate(updateLocationSchema), agentController.updateLocation);
router.post('/status', validate(updateStatusSchema), agentController.updateStatus);

export default router;