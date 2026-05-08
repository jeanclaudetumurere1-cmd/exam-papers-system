import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { login, logout, verify } from '../controllers/authController.js';
import {
  createPaper,
  deletePaper,
  getAdminPapers,
  getAnalytics,
  getComments,
  getPaper,
  getStorageSummary,
  replyToComment,
  updatePaper
} from '../controllers/adminController.js';
import { getTables } from '../controllers/tablesController.js';
import { downloadPaper, getExamPapers } from '../controllers/examPapersController.js';
import { createBookmark } from '../controllers/bookmarksController.js';
import { createPaperInteraction } from '../controllers/interactionsController.js';
import { getUsers } from '../controllers/usersController.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../../backend/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}_${safeName}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/auth/login', asyncHandler(login));
router.post('/auth/logout', logout);
router.get('/auth/verify', verify);
router.get('/tables', asyncHandler(getTables));
router.get('/exam_papers', asyncHandler(getExamPapers));
router.get('/papers/public', asyncHandler(getExamPapers));
router.get('/papers/admin', authenticateToken, asyncHandler(getAdminPapers));
router.get('/papers/admin/storage', authenticateToken, asyncHandler(getStorageSummary));
router.get('/papers/admin/comments', authenticateToken, asyncHandler(getComments));
router.get('/papers/public/category/:category', (req, res, next) => {
  req.query.category = req.params.category;
  next();
}, asyncHandler(getExamPapers));
router.get('/papers/public/level/:level', (req, res, next) => {
  req.query.level = req.params.level;
  next();
}, asyncHandler(getExamPapers));
router.get('/papers/:id/download', asyncHandler(downloadPaper));
router.get('/papers/:id', authenticateToken, asyncHandler(getPaper));
router.post('/papers', authenticateToken, upload.single('file'), asyncHandler(createPaper));
router.put('/papers/:id', authenticateToken, upload.single('file'), asyncHandler(updatePaper));
router.delete('/papers/:id', authenticateToken, asyncHandler(deletePaper));
router.post('/bookmarks', asyncHandler(createBookmark));
router.post('/paper_interactions', asyncHandler(createPaperInteraction));
router.post('/papers/:paperId/interact', (req, res, next) => {
  req.body.paper_id = req.params.paperId;
  req.body.interaction_type = req.body.interaction_type || req.body.type;
  req.body.user_identifier = req.body.user_identifier || req.body.userIdentifier;
  next();
}, asyncHandler(createPaperInteraction));
router.get('/papers/:paperId/rating', (req, res) => {
  res.json({
    success: true,
    data: {
      averageRating: 0,
      totalRatings: 0,
      views: 0,
      likes: 0
    }
  });
});
router.get('/papers/:paperId/comments', (req, res) => {
  res.json({ success: true, data: [] });
});
router.post('/papers/:paperId/comments', (req, res) => {
  res.status(201).json({ success: true, message: 'Comment received', commentId: null });
});
router.post('/papers/comments/:commentId/like', (req, res) => {
  res.json({ success: true, likes: 0 });
});
router.post('/analytics/track-visit', (req, res) => {
  res.status(204).send();
});
router.get('/analytics', authenticateToken, asyncHandler(getAnalytics));
router.post('/admin/comments/reply', authenticateToken, asyncHandler(replyToComment));
router.get('/users', asyncHandler(getUsers));

export default router;
