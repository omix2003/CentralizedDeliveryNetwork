import { Router } from 'express';
import { publicController } from '../controllers/public.controller';

const router = Router();

// Public routes (no authentication required)
router.get('/orders/:id/track', publicController.trackOrder);
router.get('/directions', publicController.getDirections);

export default router;


