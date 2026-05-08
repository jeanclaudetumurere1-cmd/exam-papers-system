import { query } from '../config/database.js';

const allowedInteractionTypes = new Set(['view', 'like', 'bookmark']);

export async function createPaperInteraction(req, res) {
  const { paper_id, interaction_type, user_identifier } = req.body;

  if (!paper_id) {
    return res.status(400).json({ success: false, message: 'paper_id is required' });
  }

  if (!allowedInteractionTypes.has(interaction_type)) {
    return res.status(400).json({
      success: false,
      message: 'interaction_type must be one of: view, like, bookmark'
    });
  }

  const identifier = user_identifier || req.ip;
  const result = await query(
    'INSERT INTO paper_interactions (paper_id, interaction_type, user_identifier) VALUES (?, ?, ?)',
    [paper_id, interaction_type, identifier]
  );

  res.status(201).json({
    success: true,
    message: 'Interaction recorded',
    data: { id: result.insertId, paper_id, interaction_type, user_identifier: identifier }
  });
}
