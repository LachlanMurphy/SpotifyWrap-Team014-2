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
  email: undefined,
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

  // spotifyApi
  // .clientCredentialsGrant()
  // .then(function (data) {
  //   spotifyApi.setAccessToken(data.body['access_token']); 

  //   return spotifyApi.getRecommendations({
  //     min_energy: 0.4,
  //     seed_artists: ['6mfK6Q2tzLMEchAr0e9Uzu', '4DYFVNKZ1uixa6SQTvzQwJ'],
  //     min_popularity: 50,
  //   });
  // })
  // .then(function (data) {
  //   const tracks = data.body.tracks; // Access the array of recommended tracks

  //   // Make sure there are tracks returned
  //   if (tracks.length > 0) {
  //     // Access the first track as an example
  //     const track = tracks[0];
  //     console.log('Artist:', track.artists[0].name);
  //     console.log('Track name:', track.name);
  //     console.log('Album:', track.album.name);
  //     console.log('Popularity:', track.popularity);
  //   } else {
  //     console.log('No recommendations found.');
  //   }
  // })
  // .catch(function (err) {
  //   console.log('Error:', err);
  // });

// Spotify api calls will go below 

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('pages/login');
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
              message: "Incorrect Username/Password."
          });
      } else {
          user.username = got.username;

          req.session.user = user;
          req.session.save();

          res.render('pages/home', {user: user, message: "logged in"});
      }
  }).catch(err => {
      res.render('pages/login', {
          message: "Incorrect Username/Password"
      });
  });
});

app.get('/home', (req, res) => {
  res.render('pages/home', {
    user: user
  });
});

app.get('/logout', (req, res) => {
  res.render('pages/logout');
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.get('/search', (req, res) => {
  res.render('pages/search');
});

app.get('/song', (req, res) => {
    // Right now, the user has to input song ID and it prints that song
    // On the search page, look up '11dFghVXANMlKmJXsNCbNl' and it should display a song by Carly Rae Jepsen
    // Or, for example, look up '7hm4HTk9encxT0LYC0J6oI' and it should display a song by the strokes
    const artist_id = req.query.song; 
    return spotifyApi.getTrack(artist_id)
  .then(function(data) { 
    const track = data.body; 
    res.render('pages/search', {
      track,
    });
  })
  .catch(function(err) {
    console.log(err);
  });
});


// potential solutions to id problem above

// FIXED SOLUTION 1 and added initial functionality to search page

// solution 1 have a function that gets user ids from users names 
// this function will search for an artist by its name and return its ID in a json object 
app.get('/searchArtist', (req, res) => {
  const artistName = req.query.artist; // Get artist name from query parameter

  if (!artistName) {
    return res.status(400).json({ error: "Please provide an artist name." });
  }

  spotifyApi
    .searchArtists(artistName) // Use Spotify's search endpoint
    .then(function(data) {
      const artists = data.body.artists.items;

      if (artists.length === 0) {
        return res.status(404).json({ error: "No artist found with that name." });
      }

      // change if we want more than 1 result 
      const artist = artists[0];
      const artistId = artist.id;

      console.log(`Artist found: ${artist.name}, ID: ${artistId}`);
      res.render('pages/search', {
        artist,
      });
      // res.json({ artistId }); // Return the ID as JSON
    })
    .catch(function(err) {
      console.error('Error searching for artist:', err);
      res.status(500).json({ error: "An error occurred while searching for the artist." });
    });
});

// SOLUTION 2 IMPLEMENTATION STILL VIABLE LATER ON

// solution 2 combine the functionality
// app.get('/song', (req, res) => {
//   const artistName = req.query.artist; 

//   if (!artistName) {
//     return res.status(400).json({ error: "Please provide an artist name." });
//   }

//   // Search for the artist to get their ID
//   spotifyApi
//     .searchArtists(artistName)
//     .then(function (data) {
//       const artists = data.body.artists.items;

//       if (artists.length === 0) {
//         return res.status(404).json({ error: "No artist found with that name." });
//       }

//       const artistId = artists[0].id; // Get the first matching artist's ID

//       // Step 2: Use the artist ID to fetch tracks
//       return spotifyApi.getRecommendations({
//         seed_artists: [artistId], // Use the artist ID as a seed
//         min_energy: 0.4,
//         min_popularity: 50,
//       });
//     })
//     .then(function (data) {
//       const tracks = data.body.tracks;

//       if (tracks.length === 0) {
//         return res.status(404).json({ error: "No tracks found for this artist." });
//       }

//       const track = tracks[0]; // Example: Use the first track
//       console.log('Track found:', track.name, 'by', track.artists[0].name);

//       // Render the results
//       res.render('pages/search', {
//         trackName: track.name,
//         artistName: track.artists[0].name,
//         albumName: track.album.name,
//         popularity: track.popularity,
//       });
//     })
//     .catch(function (err) {
//       console.error('Error fetching songs:', err);
//       res.status(500).json({ error: "An error occurred while fetching songs." });
//     });
// });

app.post('/register', async (req, res) => {

  //hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);
  
  // insert new user in users table
  const query = 'insert into users (username, password) values ($1, $2) returning *;';
  db.any(query, [
      req.body.username,
      hash
  ]).then(data => {
      res.status(200);
      res.render('pages/login', {
          message: "Registered successfully!"
      });
  }).catch(err => {
      res.render('pages/register', {
        message: "Registration failed, internal error."
      });
  });
});

app.get('/profile',(req, res) => {
  res.render('pages/profile');
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
  res.render('pages/editProfile');
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');