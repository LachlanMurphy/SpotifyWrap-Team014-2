CREATE TABLE users(
  username VARCHAR(50) PRIMARY KEY,
  password CHAR(60) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE liked_songs (
  song_id VARCHAR(255) NOT NULL PRIMARY KEY,
  song_name VARCHAR(255),
  artist_name VARCHAR(255),
  album_name VARCHAR(255),
  album_url VARCHAR(255),
  song_duration VARCHAR(255)
);

CREATE TABLE users_liked_songs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  song_id VARCHAR(255) NOT NULL,
  FOREIGN KEY (username) REFERENCES users(username),
  FOREIGN KEY (song_id) REFERENCES liked_songs(song_id)
);