require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const databaseName = process.env.DB_NAME || 'exam_system';
    const useSsl = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        ssl: useSsl ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to MySQL server');

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
        console.log('✅ Database created');

        await connection.changeUser({ database: databaseName });
        console.log('✅ Using exam_system database');

        const createExamPapers = `CREATE TABLE IF NOT EXISTS exam_papers (
            id INT PRIMARY KEY AUTO_INCREMENT,
            year INT NOT NULL,
            subject VARCHAR(100) NOT NULL,
            level ENUM('O-Level', 'A-Level') NOT NULL,
            category VARCHAR(50) NOT NULL,
            trade_or_combination VARCHAR(100),
            file_path VARCHAR(255) NOT NULL,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_year (year),
            INDEX idx_subject (subject),
            INDEX idx_level (level),
            INDEX idx_category (category),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        await connection.query(createExamPapers);
        console.log('✅ exam_papers table created');

        const createSiteVisits = `CREATE TABLE IF NOT EXISTS site_visits (
            id INT PRIMARY KEY AUTO_INCREMENT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_visited_at (visited_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        await connection.query(createSiteVisits);
        console.log('✅ site_visits table created');

        const createDownloads = `CREATE TABLE IF NOT EXISTS downloads (
            id INT PRIMARY KEY AUTO_INCREMENT,
            paper_id INT NOT NULL,
            downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
            INDEX idx_downloaded_at (downloaded_at),
            INDEX idx_paper_id (paper_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        await connection.query(createDownloads);
        console.log('✅ downloads table created');

        const createComments = `CREATE TABLE IF NOT EXISTS comments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            paper_id INT NOT NULL,
            student_name VARCHAR(100) NOT NULL,
            student_email VARCHAR(100) NOT NULL,
            comment TEXT NOT NULL,
            rating INT DEFAULT NULL CHECK (rating >= 1 AND rating <= 5),
            likes INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
            INDEX idx_paper_id (paper_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        await connection.query(createComments);
        console.log('✅ comments table created');

        const createInteractions = `CREATE TABLE IF NOT EXISTS paper_interactions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            paper_id INT NOT NULL,
            interaction_type ENUM('view', 'like', 'bookmark') NOT NULL,
            user_identifier VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE,
            UNIQUE KEY unique_interaction (paper_id, interaction_type, user_identifier),
            INDEX idx_paper_id (paper_id),
            INDEX idx_interaction_type (interaction_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

        await connection.query(createInteractions);
        console.log('✅ paper_interactions table created');

        const insertSampleData = `INSERT INTO exam_papers (year, subject, level, category, trade_or_combination, file_path, status) VALUES
            (2023, 'Mathematics', 'O-Level', 'STEM', NULL, 'uploads/sample1.pdf', 'active'),
            (2023, 'English', 'O-Level', 'Languages', NULL, 'uploads/sample2.pdf', 'active'),
            (2023, 'Physics', 'A-Level', 'STEM', 'PCM', 'uploads/sample3.pdf', 'active'),
            (2022, 'Mathematics', 'O-Level', 'STEM', NULL, 'uploads/sample4.pdf', 'active'),
            (2022, 'Chemistry', 'A-Level', 'STEM', 'PCM', 'uploads/sample5.pdf', 'inactive'),
            (2021, 'Biology', 'A-Level', 'STEM', 'PCB', 'uploads/sample6.pdf', 'active'),
            (2021, 'History', 'O-Level', 'Humanities', NULL, 'uploads/sample7.pdf', 'active')`;

        await connection.query(insertSampleData);
        console.log('✅ Sample data inserted');

        console.log('\n✅ Database setup completed successfully!');
        console.log(`Database "${databaseName}" has been created with sample data.`);
    } catch (err) {
        console.error('Error setting up database:', err.message);
        process.exit(1);
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (endErr) {
                console.error('Error closing connection:', endErr.message);
            }
        }
    }
}

main();
