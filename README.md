# Soft-Dev-Team014-2

**Application Description:**

A web application to search and get song recommendations on Spotify. You can favorite songs you like to listen to them later! 

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

Must have access to a Spotify API key - more specifically a ClientID and Client secret. These should be defined in a local .env file that you must create for the app functionality to work

**How To Run The Application Locally:**

1. cd into ProjectSourceCode

2. Open your docker desktop app and run the command docker-compose up 

3. Wait for the terminal to say 'Server is listening on port 3000'

3. Open google and search http://localhost:3000/ 

**How To Run The Tests:**

1. Open the docker-compose.yaml file

2. Comment out this line -> command: 'npm start'

3. Uncomment this line -> command: 'npm run testandrun'

4. Run the command docker-compose up

5. Test cases and their results should be printed in the terminal

**Link To The Deployed Application:**

[https://spotifywrap-team014-2.onrender.com/home](https://spotifywrap-team014-2.onrender.com/home)