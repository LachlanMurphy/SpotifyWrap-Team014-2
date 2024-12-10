# Soft-Dev-Team014-2

**Application Description:**

SongSeeker - A web application to search artists and songs on Spotify. You can also get song and artist recommendations from the music streaming service Last.fm. You can favorite songs you like to listen to them later! 

 **Project Contributors:**

 Gavin Petruzzi - gape5988

 Lachlan Murphy - LachlanMurphy

 Cody Mattox - CodyMattox

 Brady Gaona - Braeden464

 Cole Younoszai - Coledy2004
 
 Joshua Wright - joshwright04

**Technology Stack Utilized:**

NodeJS

Docker

JavaScript

HTML/Handlebars/Css

SQL

**Prerequisites Required To Run:**

Must run on a Linux OS 

**How To Run The Application Locally:**

In order to Run the application locally, you must have access to two different API Keys:

    -> Spotify API key: More specifically a ClientID and Client secret. These should be defined in a local .env file that you must create.        ClientID should be defined as a variable called 'CLIENT_ID', ans Client Secret should be defined under a variable 'CLIENT_SECRET.'

    -> Last.fm API key: Should be defined under a variable called CLIENT_API.

1. cd into ProjectSourceCode

2. Open your docker desktop app and run the command docker-compose up 

3. Wait for the terminal to say 'Server is listening on port 3000'

3. Open google and search http://localhost:3000/ 

**How To Run The Tests:**

1. Open the Docker desktop app

2. Run the command docker-compose up

3. Test cases and their results should be printed in the terminal

**Link To The Deployed Application:**

[https://spotifywrap-team014-2.onrender.com/home](https://spotifywrap-team014-2.onrender.com/home)
