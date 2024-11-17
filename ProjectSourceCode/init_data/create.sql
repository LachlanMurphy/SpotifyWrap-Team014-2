CREATE TABLE users(
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE liked_songs (
    song_id VARCHAR(255) NOT NULL,
    song_name VARCHAR(255),
    artist_name VARCHAR(255),
    album_name VARCHAR(255),
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
