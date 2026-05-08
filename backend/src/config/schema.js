import { pool } from './database.js';

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_papers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      year INT NOT NULL,
      subject VARCHAR(150) NOT NULL,
      level VARCHAR(80) NOT NULL,
      category VARCHAR(120) NULL,
      trade_or_combination VARCHAR(150) NULL,
      file_path VARCHAR(255) NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_exam_papers_status (status),
      INDEX idx_exam_papers_year (year),
      INDEX idx_exam_papers_subject (subject)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NULL,
      role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INT PRIMARY KEY AUTO_INCREMENT,
      paper_id INT NOT NULL,
      ip_address VARCHAR(45) NULL,
      bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
      INDEX idx_bookmarks_paper_id (paper_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS paper_interactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      paper_id INT NOT NULL,
      interaction_type ENUM('view', 'like', 'bookmark') NOT NULL,
      user_identifier VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
      INDEX idx_paper_interactions_paper_id (paper_id),
      INDEX idx_paper_interactions_type (interaction_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('Database schema is ready');
}
