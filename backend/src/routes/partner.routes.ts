import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePartner } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { partnerController } from '../controllers/partner.controller';
import { updateWebhookSchema } from '../utils/validation.schemas';

const router = Router();

// All routes require authentication and partner role
router.use(authenticate);
router.use(requirePartner);

// Partner profile routes
router.get('/profile', partnerController.getProfile);
router.put('/webhook', validate(updateWebhookSchema), partnerController.updateWebhook);

export default router;