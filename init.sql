-- Use the database created by docker-compose
USE media_platform;

-- Admin users (for managing the platform)
CREATE TABLE IF NOT EXISTS AdminUser (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Media table (stores uploaded media items like videos, images, etc.)
CREATE TABLE IF NOT EXISTS media_asset (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(500) NOT NULL,
    uploaded_by INT, -- could reference AdminUser
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES AdminUser(id) ON DELETE SET NULL
);

-- Media views log (every time a user views media)
CREATE TABLE IF NOT EXISTS media_view_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    media_id INT NOT NULL,
    viewed_by_ip VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_id) REFERENCES Media(id) ON DELETE CASCADE
);