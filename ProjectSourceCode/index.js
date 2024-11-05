// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

// Make sure to include spotify web api library in package.json file too 
const SpotifyWebApi = require("spotify-web-api-node");

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

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
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     saveUninitialized: false,
//     resave: false,
//   })
// );

// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// Adapted code from this repository in order to fetch and update bearer access_token 
// https://github.com/diana-moreno/spotify-express/blob/master/index.js
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID, 
  clientSecret: process.env.CLIENT_SECRET
});

// GET TRACK BASED ON ARTIST ID
// ----------------------------
spotifyApi
  .clientCredentialsGrant()
  .then(function(data) {
    spotifyApi.setAccessToken(data.body['access_token']); // Set temporary access token for one hour (3600 seconds)
    // Uncomment below line to view temporary bearer access_token in the terminal
    // console.log(data.body); 
    // const artist_id = req.body.userInput; // Update with function to take in user
    artist_id = '11dFghVXANMlKmJXsNCbNl'; 
    return spotifyApi.getTrack(artist_id); 
  }) 
  .then(function(data) { 
    const track = data.body; 
    // Comment these out later -> Testing to make sure track data is being correctly sourced from spotify 
    console.log('Artist:', track.album.artists[0].name); 
    console.log('Track name:', track.name); 
    console.log('Album:', track.album.name); 
    console.log('Popularity:', track.popularity); 
  })
  .catch(function(err) {
    console.log(err);
  });

  spotifyApi
  .clientCredentialsGrant()
  .then(function (data) {
    spotifyApi.setAccessToken(data.body['access_token']); 

    return spotifyApi.getRecommendations({
      min_energy: 0.4,
      seed_artists: ['6mfK6Q2tzLMEchAr0e9Uzu', '4DYFVNKZ1uixa6SQTvzQwJ'],
      min_popularity: 50,
    });
  })
  .then(function (data) {
    const tracks = data.body.tracks; // Access the array of recommended tracks

    // Make sure there are tracks returned
    if (tracks.length > 0) {
      // Access the first track as an example
      const track = tracks[0];
      console.log('Artist:', track.artists[0].name);
      console.log('Track name:', track.name);
      console.log('Album:', track.album.name);
      console.log('Popularity:', track.popularity);
    } else {
      console.log('No recommendations found.');
    }
  })
  .catch(function (err) {
    console.log('Error:', err);
  });

  // More spotify api calls will go below 

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  try {
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);

    if (!user) {
      return res.render('pages/login', { error: 'Incorrect username or password.' });
    }

    const match = await bcrypt.compare(req.body.password, user.password);

    if (!match) {
      return res.render('pages/login', { error: 'Incorrect username or password.' });
    }

    // Save user details in the session
    req.session.user = user;
    req.session.save(() => {
      res.redirect('/discover'); // Redirect to discover if login is successful
    });
  } catch (error) {
    console.error('Error during login process:', error);
    res.render('pages/login', { error: 'An error occurred. Please try again later.' });
  }
});

app.get('/home', (req, res) => {
  res.render('pages/home');
});

app.get('/logout', (req, res) => {
  res.render('pages/logout');
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

<<<<<<< Updated upstream
app.get('/search', (req, res) => {
  res.render('pages/search');
});
=======
// app.post('/register', async (req, res) => {

//   try {
//   const hash = await bcrypt.hash(req.body.password, 10);
//   const query = 'INSERT INTO users(username, hash) VALUES($1, $2)';
//   const username =  req.body.username;
//   await db.any(query, [username, hashedPassword]);
  
//   res.redirect('/login');
// } 
// catch (error) {
//   console.error('Error registering user:', error);

  
//   res.redirect('/register');
// }

// });
>>>>>>> Stashed changes

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');