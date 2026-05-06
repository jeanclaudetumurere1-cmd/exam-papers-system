-- Create database
CREATE DATABASE IF NOT EXISTS exam_system;
USE exam_system;

-- Exam papers table
CREATE TABLE IF NOT EXISTS exam_papers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    level ENUM('O-Level', 'A-Level') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_year (year),
    INDEX idx_subject (subject),
    INDEX idx_level (level),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site visits tracking
CREATE TABLE IF NOT EXISTS site_visits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_visited_at (visited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Downloads tracking
CREATE TABLE IF NOT EXISTS downloads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    paper_id INT NOT NULL,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
    INDEX idx_downloaded_at (downloaded_at),
    INDEX idx_paper_id (paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data
INSERT INTO exam_papers (year, subject, level, file_path, status) VALUES
(2023, 'Mathematics', 'O-Level', 'uploads/sample1.pdf', 'active'),
(2023, 'English', 'O-Level', 'uploads/sample2.pdf', 'active'),
(2023, 'Physics', 'A-Level', 'uploads/sample3.pdf', 'active'),
(2022, 'Mathematics', 'O-Level', 'uploads/sample4.pdf', 'active'),
(2022, 'Chemistry', 'A-Level', 'uploads/sample5.pdf', 'inactive'),
(2021, 'Biology', 'A-Level', 'uploads/sample6.pdf', 'active'),
(2021, 'History', 'O-Level', 'uploads/sample7.pdf', 'active');

-- Insert sample visits
INSERT INTO site_visits (ip_address, user_agent) VALUES
('127.0.0.1', 'Mozilla/5.0 Sample Agent'),
('127.0.0.2', 'Chrome/91.0 Sample'),
('127.0.0.3', 'Firefox/89.0 Sample');

-- Insert sample downloads
INSERT INTO downloads (paper_id) VALUES
(1), (1), (2), (3), (1), (2), (4), (5), (1), (3);