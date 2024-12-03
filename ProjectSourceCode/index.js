// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

// Make sure to include spotify web api library in package.json file too 
const SpotifyWebApi = require("spotify-web-api-node");

// Include LastFMApi library too
const LastFmApi = require("last-fm");

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
  host: process.env.POSTGRES_HOST, // the database server
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

// Api key authentication method sourced from library documentation. Can be found at: https://www.npmjs.com/package/last-fm?activeTab=readme 
const lastFmApi = new LastFmApi(process.env.CLIENT_API);

// lastFmApi.trackSearch({q: 'the greatest'}, (err, data) => {
//   if (err) console.error(err)
//   else console.log(data)
// })

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

          res.render('pages/home', {user: user, message: "Successfully Logged in!"});
          // res.redirect('/home');

      }
  }).catch(err => {
      res.render('pages/login', {
          message: "User does not exist. Register an account or try again."
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
  // console.log(req.session.user);
  res.render('pages/home', {
    user
  });
});

app.get('/favorites', (req, res) => {

  const query = 'select * FROM users inner join users_liked_songs on users.username = users_liked_songs.username inner join liked_songs on liked_songs.song_id = users_liked_songs.song_id where users.username = $1;';
  db.any(query, [user.username]).then(data => {
    res.render('pages/favorites', {
      user,
      data
    })
  }).catch(err => {
    console.log(err);
  });
});

app.get('/editProfile',(req, res) => {
  res.render('pages/editProfile', {user});
});

app.get('/searchByArtist',(req, res) => {
  res.render('pages/searchByArtist', {user});
});

app.get('/searchBySong',(req, res) => {
  res.render('pages/searchBySong', {user});
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  user.username = undefined;
  user.logged_in = false;
  user.phone = undefined;
  user.name = undefined;
  res.render('pages/logout');
});


// All spotify related functions were referenced and adpated from 
// this website which defines and references the functions in the
// library we used, visit this for more examples: https://www.npmjs.com/package/spotify-web-api-node#more-examples
app.get('/song', async (req, res) => {
  const songName = req.query.song; // Get the song name from query parameter

  if (!songName) {
    res.render('pages/searchBySong', {
      message: "Please provide a song name.",
      user
    })
  }
 
  spotifyApi
    .searchTracks(songName) // Use Spotify's search endpoint for tracks
    .then(function(data) {
      const tracks = data.body.tracks.items;
 
      if (tracks.length === 0) {
        res.render('pages/searchBySong', {
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

      const recSong = { 
        name: fiveSongs[0].name,
        artistName: fiveSongs[0].album.artists[0].name
      };

      // Studied and adapted function definitions from https://www.npmjs.com/package/last-fm?activeTab=readme 
      // to correctly pass arguments into functions defined in 'last-fm' library
      lastFmApi.trackSimilar({name: recSong.name, artistName: recSong.artistName}, async (error, result) => {
        if (error){
          res.render('pages/searchBySong', {
            message: `An error occurred while getting recommendations`,
            fiveSongs,
          });
        } 
        else 
        {
          const songRecommendations = result.track.slice(0, 5);
          let spotReccomendedSongs = [];
          
          for (let track = 0; track < songRecommendations.length; track++) {
            await spotifyApi.searchTracks(songRecommendations[track].name).then(d => {
              spotReccomendedSongs.push(d.body.tracks.items[0]);
            });
          }

          for (let i = 0; i < spotReccomendedSongs.length; i++) {
            spotReccomendedSongs[i].min = Math.floor(spotReccomendedSongs[i].duration_ms / 60000);
            spotReccomendedSongs[i].sec = Math.floor(spotReccomendedSongs[i].duration_ms / 1000) % 60;
            spotReccomendedSongs[i].padding = "";
            if(spotReccomendedSongs[i].sec < 5)
            {
              spotReccomendedSongs[i].padding = "0";
            }
          }

          res.render('pages/searchBySong', {
            spotReccomendedSongs: spotReccomendedSongs,
            message: `Showing searchBySong results for: ${songName}`,
            fiveSongs,
          });
        }
      })
    })
    .catch(function(err) {
      res.render('pages/searchBySong', {
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
        res.render('pages/searchByArtist', {
          message: "No artist found with that name.",
          user
        })
      }

      // change if we want more than 1 result 
      const artist = artists[0];

      // Convert follower count into a string with commas separating it 
      artist.followers.total = artist.followers.total.toLocaleString();

      spotifyApi.getArtistTopTracks(artist.id)
      .then(function(data) {
          const topTracks = data.body.tracks.slice(0, 5);

          for (let i = 0; i < 5; i++) {
            topTracks[i].min = Math.floor(topTracks[i].duration_ms / 60000);
            topTracks[i].sec = Math.floor(topTracks[i].duration_ms / 1000) % 60;
            topTracks[i].padding = "";
            if(topTracks[i].sec < 10)
            {
              topTracks[i].padding = "0";
            }
          }
          // Studied and adapted function definitions from https://www.npmjs.com/package/last-fm?activeTab=readme 
          // to correctly pass arguments into functions defined in 'last-fm' library
          lastFmApi.artistSimilar({name: artist.name}, (error, result) => {
            if (error){
              res.render('pages/searchByArtist', {
                message: `An error occurred while getting recommendations`,
                artist,
                topTracks,
              });
            } 
            else 
            {
              const artistRecommendations = result.artist.slice(0, 10);
              // console.log(artistRecommendations)
              res.render('pages/searchByArtist', {
                artistRecommendations: artistRecommendations,
                message: `Artist Found: ${artist.name}`,
                artist,
                topTracks,
              });
            }
          })
        });
    })
    .catch(function(err) {
      res.render('pages/searchByArtist', {
        message: "An error occurred while searching for the artist.",
        user
      })
      console.error('Error searching for artist:', err);
    });
});

// app.get('/getRecommendations', (req, res) => {
//   const artist1 = req.query.artist1;
//   const song1 = req.query.song1;
//   const genre = req.query.genre;

//   spotifyApi
//     .searchArtists(artist1) 
//     .then(function(data) {
//       const artists = data.body.artists.items; 

//       if (artists.length === 0) {
//         res.render('pages/search', {
//           message: "No artist found with that name.",
//           user
//         });
//         return; 
//       }

//       const artist1Id = artists[0].id; 
//       // console.log(artist1Id);

//       spotifyApi
//         .searchTracks(song1) 
//         .then(function(data) {
//           const songs = data.body.tracks.items; 

//           if (songs.length === 0) {
//             res.render('pages/recommendations', {
//               message: "No song found with that name.",
//               user
//             });
//             return; 
//           }

//           const song1Id = songs[0].id;
//           // console.log(song1Id);

//           spotifyApi
//             .getAvailableGenreSeeds() 
//             .then(function(data) {
//               const genres = data.body.genres; 

//               if (genres.length === 0) {
//                 res.render('pages/recommendations', {
//                   message: "No genre found with that name.",
//                   user
//                 });
//                 return; 
//               }
//               const genreId = genres[0]; 
//               spotifyApi.getRecommendations({
//                 seed_artists: [artist1Id],
//                 seed_tracks: [song1Id],
//                 seed_genres: [genreId], 
//               })
//                 .then(function(data) {
//                   const recommendations = data.body.tracks;
//                   const tenSongs = recommendations.slice(0, 10);
//                   for (let i = 0; i < 10; i++) {
//                     tenSongs[i].min = Math.floor(tenSongs[i].duration_ms / 60000);
//                     tenSongs[i].sec = Math.floor(tenSongs[i].duration_ms / 1000) % 60;
//                     tenSongs[i].padding = "";
//                     if(tenSongs[i].sec < 10)
//                     {
//                       tenSongs[i].padding = "0";
//                     }
//                   }
//                   res.render('pages/recommendations', {
//                     tenSongs,
//                   });
//                 })
//                 .catch(function(err) {
//                   console.log("Error fetching recommendations:", err);
//                   res.render('pages/recommendations', {
//                     message: "An error occurred while getting recommendations.",
//                     user
//                   });
//                 });
//             })
//             .catch(function(err) {
//               console.error('Error fetching genres:', err);
//               res.render('pages/recommendations', {
//                 message: "An error occurred while fetching genres.",
//                 user
//               });
//             });
//         })
//         .catch(function(err) {
//           console.error('Error searching for song 1:', err);
//           res.render('pages/recommendations', {
//             message: "An error occurred while searching for the song.",
//             user
//           });
//         });
//     })
//     .catch(function(err) {
//       console.error('Error searching for artist 1:', err);
//       res.render('pages/recommendations', {
//         message: "An error occurred while searching for the artist.",
//         user
//       });
//     });
// });

app.post('/favorite', async (req, res) => {

  const query = "insert into liked_songs (song_id, song_name, artist_name, album_name, album_url, song_duration) values ($1, $2, $3, $4, $5, $6) returning *;";
  const {song_id, song_name, artist_name, album_name, album_url, song_duration} = req.body;

  await db.one(query, [song_id, song_name, artist_name, album_name, album_url, song_duration])
  .catch(err => {
    console.log();
  });

  await db.one('insert into users_liked_songs (username, song_id) values ($1, $2) returning *;', [user.username, song_id])
  .catch(err => {
    console.log();
  })
});


app.put('/update_user', function (req, res) {
  const query =
    'update userinfo set name = $1 where username = $2 returning * ;';
  // $1 and $2 will be replaced by req.body.name, req.body.username
  db.any(query, [req.body.name, req.body.username])
    // if query execution succeeds
    // send success message
    .then(function (data) {
      res.status(201).json({
        status: 'success',
        data: data,
        message: 'data updated successfully',
      });
    })
    // if query execution fails
    // send error message
    .catch(function (err) {
      return console.log(err);
    });
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');