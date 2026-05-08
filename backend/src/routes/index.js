import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getTables } from '../controllers/tablesController.js';
import { getExamPapers } from '../controllers/examPapersController.js';
import { createBookmark } from '../controllers/bookmarksController.js';
import { createPaperInteraction } from '../controllers/interactionsController.js';
import { getUsers } from '../controllers/usersController.js';

const router = Router();

router.get('/tables', asyncHandler(getTables));
router.get('/exam_papers', asyncHandler(getExamPapers));
router.post('/bookmarks', asyncHandler(createBookmark));
router.post('/paper_interactions', asyncHandler(createPaperInteraction));
router.get('/users', asyncHandler(getUsers));

export default router;
