// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

// Make sure to include spotify web api library in package.json file too 
const SpotifyWebApi = require("spotify-web-api-node");

const express = require('express'); // To build an application server or API
const app = express();
app.use(express.static('public')); //added so that the style.css file works
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.


const user = {
  username: undefined,
  logged_in: false,
  phone: undefined,
  name: undefined,
};

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// Adapted code from this repository in order to fetch and update bearer access_token 
// https://github.com/diana-moreno/spotify-express/blob/master/index.js
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID, 
  clientSecret: process.env.CLIENT_SECRET
});

spotifyApi
  .clientCredentialsGrant()
  .then(function(data) {
    spotifyApi.setAccessToken(data.body['access_token']); // Set temporary access token for one hour (3600 seconds)
    // Uncomment below line to view temporary bearer access_token in the terminal
    // console.log(data.body);  
  }) 

// Spotify api calls will go below 

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('pages/login', {user});
});

app.get('/register', (req, res) => {
  res.render('pages/register', {user});
});

app.get('/profile',(req, res) => {
  res.render('pages/profile', {
    user
  });
});

app.get('/search', (req, res) => {
  res.render('pages/search', {user});
});

app.get('/recommendations', (req, res) => {
  res.render('pages/recommendations', {user});
});

app.post('/register', async (req, res) => {

  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);
  
  // insert new user in users table
  const query = 'insert into users (username, password, phone, name) values ($1, $2, $3, $4) returning *;';
  db.any(query, [
      req.body.username,
      hash,
      req.body.phone,
      req.body.name
  ]).then(data => {
      res.render('pages/login', {
          message: "Registered successfully!"
      });
  }).catch(err => {
      res.render('pages/register', {
        message: "Registration failed: username already exists."
      });
  });
});

app.post('/login', async (req, res) => {
  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);
  // check if user exists in database
  const query = 'select * from users where username = ($1) limit 1;';
  db.one(query, [req.body.username]).then(async got => {

      // check if password from request matches with password in DB
      const match = await bcrypt.compare(req.body.password, got.password);
      if (!match) {
          res.render('pages/login', {
              message: "Incorrect Username/Password"
          });
      } else {
          user.username = got.username;
          user.logged_in = true;
          user.phone = got.phone;
          user.name = got.name;

          req.session.user = user;

          req.session.save();

          // res.render('pages/home', {user: user, message: "logged in"});
          res.redirect('/home');

      }
  }).catch(err => {
      res.render('pages/login', {
          message: "Incorrect Username/Password"+err
      });
  });
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

app.use(auth);

app.get('/home', (req, res) => {
  console.log(req.session.user);
  res.render('pages/home', {
    user
  });
});

app.get('/favorites', (req, res) => {
  res.render('pages/favorites', {
    user,
    favoriteSongs: []
  });
});

app.get('/editProfile',(req, res) => {
  res.render('pages/editProfile', {user});
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  user.username = undefined;
  user.logged_in = false;
  user.phone = undefined;
  user.name = undefined;
  res.render('pages/logout');
});


// All spotify relted functions were referenced and adpated from 
// this website which defines and references the functions in the
// library we used, visit this for more examples: https://www.npmjs.com/package/spotify-web-api-node#more-examples
app.get('/song', (req, res) => {
  const songName = req.query.song; // Get the song name from query parameter

  if (!songName) {
    res.render('pages/search', {
      message: "Please provide a song name",
      user
    })
  }
 
  spotifyApi
    .searchTracks(songName) // Use Spotify's search endpoint for tracks
    .then(function(data) {
      const tracks = data.body.tracks.items;
 
      if (tracks.length === 0) {
        res.render('pages/search', {
          message: "No song found",
          user
        })
      }
 
      // change if we wanna show more songs
      const fiveSongs = tracks.slice(0, 5);

      for (let i = 0; i < 5; i++) {
        fiveSongs[i].min = Math.floor(fiveSongs[i].duration_ms / 60000);
        fiveSongs[i].sec = Math.floor(fiveSongs[i].duration_ms / 1000) % 60;
        fiveSongs[i].padding = "";
        if(fiveSongs[i].sec < 10)
        {
          fiveSongs[i].padding = "0";
        }
      }

      // console.log(`Track found: ${track.name} by ${track.artists[0].name}`);
      res.render('pages/search', {
        fiveSongs,
      });
    })
    .catch(function(err) {
      res.render('pages/search', {
        message: "An error occured while searching for the song.",
        user
      })
    });
});
   

app.get('/searchArtist', (req, res) => {
  const artistName = req.query.artist; // Get artist name from query parameter

  if (!artistName) {
    res.render('pages/search', {
      message: "Please provide an artist name.",
      user
    })
  }

  spotifyApi
    .searchArtists(artistName) // Use Spotify's search endpoint
    .then(function(data) {
      const artists = data.body.artists.items;

      if (artists.length === 0) {
        res.render('pages/search', {
          message: "No artist found with that name.",
          user
        })
      }

      // change if we want more than 1 result 
      const artist = artists[0];
      const artistId = artist.id;

      // console.log(`Artist found: ${artist.name}, ID: ${artistId}`);
      res.render('pages/search', {
        artist,
      });
      // res.json({ artistId }); // Return the ID as JSON
    })
    .catch(function(err) {
      res.render('pages/search', {
        message: "An error occurred while searching for the artist.",
        user
      })
      console.error('Error searching for artist:', err);
    });
});

app.get('/getRecommendations', (req, res) => {
  const artist1 = req.query.artist1;
  const song1 = req.query.song1;
  const genre = req.query.genre;

  spotifyApi
    .searchArtists(artist1) 
    .then(function(data) {
      const artists = data.body.artists.items; 

      if (artists.length === 0) {
        res.render('pages/search', {
          message: "No artist found with that name.",
          user
        });
        return; 
      }

      const artist1Id = artists[0].id; 
      // console.log(artist1Id);

      spotifyApi
        .searchTracks(song1) 
        .then(function(data) {
          const songs = data.body.tracks.items; 

          if (songs.length === 0) {
            res.render('pages/recommendations', {
              message: "No song found with that name.",
              user
            });
            return; 
          }

          const song1Id = songs[0].id;
          // console.log(song1Id);

          spotifyApi
            .getAvailableGenreSeeds() 
            .then(function(data) {
              const genres = data.body.genres; 

              if (genres.length === 0) {
                res.render('pages/recommendations', {
                  message: "No genre found with that name.",
                  user
                });
                return; 
              }
              const genreId = genres[0]; 
              spotifyApi.getRecommendations({
                seed_artists: [artist1Id],
                seed_tracks: [song1Id],
                seed_genres: [genreId], 
              })
                .then(function(data) {
                  const recommendations = data.body.tracks;
                  const tenSongs = recommendations.slice(0, 10);
                  for (let i = 0; i < 10; i++) {
                    tenSongs[i].min = Math.floor(tenSongs[i].duration_ms / 60000);
                    tenSongs[i].sec = Math.floor(tenSongs[i].duration_ms / 1000) % 60;
                    tenSongs[i].padding = "";
                    if(tenSongs[i].sec < 10)
                    {
                      tenSongs[i].padding = "0";
                    }
                  }
                  res.render('pages/recommendations', {
                    tenSongs,
                  });
                })
                .catch(function(err) {
                  console.log("Error fetching recommendations:", err);
                  res.render('pages/recommendations', {
                    message: "An error occurred while getting recommendations.",
                    user
                  });
                });
            })
            .catch(function(err) {
              console.error('Error fetching genres:', err);
              res.render('pages/recommendations', {
                message: "An error occurred while fetching genres.",
                user
              });
            });
        })
        .catch(function(err) {
          console.error('Error searching for song 1:', err);
          res.render('pages/recommendations', {
            message: "An error occurred while searching for the first song.",
            user
          });
        });
    })
    .catch(function(err) {
      console.error('Error searching for artist 1:', err);
      res.render('pages/recommendations', {
        message: "An error occurred while searching for the first artist.",
        user
      });
    });
});

// app.put('/profile', async (req, res) => {
//   try {
//     const user = await user.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ error });
//   }
// });

app.get('/editProfile',(req, res) => {
  res.render('pages/editProfile', {user});
});

// Route to like a song
// app.post('/like-song', async (req, res) => {
//   const { songId, songName, artistName, albumName } = req.body;
//   const username = req.session.user && req.session.user.username; // Assuming the username is stored in the session

//   if (!username) {
//       return res.status(403).json({ message: "User not logged in" });
//   }

//   const query = `
//       INSERT INTO liked_songs (song_id, song_name, artist_name, album_name, username)
//       VALUES ($1, $2, $3, $4, $5)
//       RETURNING *;
//   `;

//   try {
//       const result = await db.one(query, [songId, songName, artistName, albumName, username]);
//       res.json({ message: "Song liked successfully!", song: result });
//   } catch (error) {
//       console.error('Error liking song:', error);
//       res.status(500).json({ message: "Error liking song" });
//   }
// });

// // Route to get liked songs for the user
// app.get('/liked-songs', async (req, res) => {
//   const username = req.session.user && req.session.user.username;

//   if (!username) {
//       return res.status(403).json({ message: "User not logged in" });
//   }

//   const query = 'SELECT * FROM liked_songs WHERE username = $1 ORDER BY date_liked DESC;';
  
//   try {
//       const likedSongs = await db.any(query, [username]);
//       res.render('pages/liked-songs', { likedSongs });
//   } catch (error) {
//       console.error('Error fetching liked songs:', error);
//       res.status(500).json({ message: "Error fetching liked songs" });
//   }
// });


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');