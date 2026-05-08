import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getTables } from '../controllers/tablesController.js';
import { downloadPaper, getExamPapers } from '../controllers/examPapersController.js';
import { createBookmark } from '../controllers/bookmarksController.js';
import { createPaperInteraction } from '../controllers/interactionsController.js';
import { getUsers } from '../controllers/usersController.js';

const router = Router();

router.get('/tables', asyncHandler(getTables));
router.get('/exam_papers', asyncHandler(getExamPapers));
router.get('/papers/public', asyncHandler(getExamPapers));
router.get('/papers/public/category/:category', (req, res, next) => {
  req.query.category = req.params.category;
  next();
}, asyncHandler(getExamPapers));
router.get('/papers/public/level/:level', (req, res, next) => {
  req.query.level = req.params.level;
  next();
}, asyncHandler(getExamPapers));
router.get('/papers/:id/download', asyncHandler(downloadPaper));
router.post('/bookmarks', asyncHandler(createBookmark));
router.post('/paper_interactions', asyncHandler(createPaperInteraction));
router.post('/papers/:paperId/interact', (req, res, next) => {
  req.body.paper_id = req.params.paperId;
  req.body.interaction_type = req.body.interaction_type || req.body.type;
  req.body.user_identifier = req.body.user_identifier || req.body.userIdentifier;
  next();
}, asyncHandler(createPaperInteraction));
router.post('/analytics/track-visit', (req, res) => {
  res.status(204).send();
});
router.get('/users', asyncHandler(getUsers));

export default router;
