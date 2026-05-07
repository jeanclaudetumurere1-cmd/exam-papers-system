const db = require('../config/database');

async function tableExists(tableName) {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    return rows.length > 0;
}

async function getColumns(tableName) {
    const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\``);
    return new Set(rows.map(row => row.Field));
}

async function addColumn(tableName, columnName, definition) {
    const columns = await getColumns(tableName);
    if (!columns.has(columnName)) {
        await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
    }
}

async function ensureCommentsTable() {
    if (!(await tableExists('comments'))) {
        await db.query(`
            CREATE TABLE comments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                paper_id INT NOT NULL,
                student_name VARCHAR(100) NULL,
                student_email VARCHAR(100) NULL,
                user_name VARCHAR(100) NULL,
                user_email VARCHAR(100) NULL,
                comment TEXT NOT NULL,
                rating INT DEFAULT NULL,
                likes INT DEFAULT 0,
                is_admin_comment TINYINT(1) DEFAULT 0,
                parent_comment_id INT DEFAULT NULL,
                admin_reply TEXT DEFAULT NULL,
                replied_at TIMESTAMP NULL DEFAULT NULL,
                status ENUM('visible', 'hidden') DEFAULT 'visible',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_paper_id (paper_id),
                INDEX idx_parent_comment_id (parent_comment_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        return;
    }

    await addColumn('comments', 'student_name', 'student_name VARCHAR(100) NULL');
    await addColumn('comments', 'student_email', 'student_email VARCHAR(100) NULL');
    await addColumn('comments', 'user_name', 'user_name VARCHAR(100) NULL');
    await addColumn('comments', 'user_email', 'user_email VARCHAR(100) NULL');
    await addColumn('comments', 'rating', 'rating INT DEFAULT NULL');
    await addColumn('comments', 'likes', 'likes INT DEFAULT 0');
    await addColumn('comments', 'is_admin_comment', 'is_admin_comment TINYINT(1) DEFAULT 0');
    await addColumn('comments', 'parent_comment_id', 'parent_comment_id INT DEFAULT NULL');
    await addColumn('comments', 'admin_reply', 'admin_reply TEXT DEFAULT NULL');
    await addColumn('comments', 'replied_at', 'replied_at TIMESTAMP NULL DEFAULT NULL');
    await addColumn('comments', 'status', "status ENUM('visible', 'hidden') DEFAULT 'visible'");
    await addColumn('comments', 'updated_at', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    await db.query('UPDATE comments SET student_name = user_name WHERE student_name IS NULL AND user_name IS NOT NULL');
    await db.query('UPDATE comments SET student_email = user_email WHERE student_email IS NULL AND user_email IS NOT NULL');
    await db.query('UPDATE comments SET user_name = student_name WHERE user_name IS NULL AND student_name IS NOT NULL');
    await db.query('UPDATE comments SET user_email = student_email WHERE user_email IS NULL AND student_email IS NOT NULL');

    try {
        await db.query('ALTER TABLE comments MODIFY user_name VARCHAR(100) NULL');
        await db.query('ALTER TABLE comments MODIFY user_email VARCHAR(100) NULL');
        await db.query('ALTER TABLE comments MODIFY student_name VARCHAR(100) NULL');
        await db.query('ALTER TABLE comments MODIFY student_email VARCHAR(100) NULL');
    } catch (error) {
        console.warn('Could not relax comment name/email columns:', error.message);
    }
}

async function ensurePaperInteractionsTable() {
    if (await tableExists('paper_interactions')) return;

    await db.query(`
        CREATE TABLE paper_interactions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            paper_id INT NOT NULL,
            interaction_type ENUM('view', 'like', 'bookmark') NOT NULL,
            user_identifier VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_interaction (paper_id, interaction_type, user_identifier),
            INDEX idx_paper_id (paper_id),
            INDEX idx_interaction_type (interaction_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function ensureDownloadsTable() {
    if (await tableExists('downloads')) return;

    await db.query(`
        CREATE TABLE downloads (
            id INT PRIMARY KEY AUTO_INCREMENT,
            paper_id INT NOT NULL,
            downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_downloaded_at (downloaded_at),
            INDEX idx_paper_id (paper_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function ensureExamPaperColumns() {
    if (!(await tableExists('exam_papers'))) return;

    await addColumn('exam_papers', 'download_count', 'download_count INT DEFAULT 0');

    try {
        await db.query("ALTER TABLE exam_papers MODIFY level ENUM('Primary', 'O-Level', 'A-Level') NOT NULL");
    } catch (error) {
        console.warn('Could not update level enum:', error.message);
    }

    try {
        await db.query("ALTER TABLE exam_papers MODIFY category ENUM('General', 'TVET') DEFAULT 'General'");
    } catch (error) {
        console.warn('Could not update category enum:', error.message);
    }
}

async function ensureSchema() {
    await ensureExamPaperColumns();
    await ensureDownloadsTable();
    await ensurePaperInteractionsTable();
    await ensureCommentsTable();
    console.log('Database schema is ready');
}

module.exports = ensureSchema;
