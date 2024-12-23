// ********************** Initialize server **********************************

const server = require('../index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************

// Example Positive Testcase :
// API: /add_user
// Input: {id: 5, name: 'John Doe', dob: '2020-02-20'}
// Expect: res.status == 200 and res.body.message == 'Success'
// Result: This test case should pass and return a status 200 along with a "Success" message.
// Explanation: The testcase will call the /add_user API with the following input
// and expects the API to return a status of 200 along with the "Success" message.



  //We are checking POST /add_user API by passing the user info in in incorrect manner (name cannot be an integer). This test case should pass and return a status 400 along with a "Invalid input" message.

//  describe('Testing Add User API', () => {
//   it('positive : /add_user', done => {
//     chai
//     .request(server)
//     .post('/add_user')
//     .send({username:'coledy2004', password:'654321'})
//     .end((err, res) => {
//         expect(res).to.have.status(200);
//         expect(res.body.message).to.equals('Success');
//         done();
//     // Refer above for the positive testcase implementation
//   });

  // Example Negative Testcase :
  // API: /add_user
  // Input: {id: 5, name: 10, dob: '2020-02-20'}
  // Expect: res.status == 400 and res.body.message == 'Invalid input'
  // Result: This test case should pass and return a status 400 along with a "Invalid input" message.
  // Explanation: The testcase will call the /add_user API with the following invalid inputs
  // and expects the API to return a status of 400 along with the "Invalid input" message.
//   it('Negative : /add_user. Checking invalid name', done => {
//     chai
//       .request(server)
//       .post('/add_user')
//       .send({username: 10, password: ''})
//       .end((err, res) => {
//         expect(res).to.have.status(400);
//         expect(res.body.message).to.equals('Invalid input');
//         done();
//       });
//   });
// });
//  });

//  describe('Testing Redirect', () => {
//     // Sample test case given to test /test endpoint.
//     it('\test route should redirect to /login with 302 HTTP status code', done => {
//       chai
//         .request(server)
//         .get('/test')
//         .end((err, res) => {
//           res.should.have.status(302); // Expecting a redirect status code
//           res.should.redirectTo(/^.*127\.0\.0\.1.*\/login$/); // Expecting a redirect to /login with the mentioned Regex
//           done();
//         });
//     });
//   });



//   describe('Testing Render', () => {
//     // Sample test case given to test /test endpoint.
//     it('test "/login" route should render with an html response', done => {
//       chai
//         .request(server)
//         .get('/login') // for reference, see lab 8's login route (/login) which renders home.hbs
//         .end((err, res) => {
//           res.should.have.status(200); // Expecting a success status code
//           res.should.be.html; // Expecting a HTML response
//           done();
//         });
//     });
//   });


  // added tests

  //We are checking POST /add_user API by passing the user info in in incorrect manner (name cannot be an integer). This test case should pass and return a status 400 along with a "Invalid input" message.


  describe('Testing Register API', () => {
    it('positive : /register', done => {
      chai
        .request(server)
        .post('/register')
        .send({username: "Big_Guy_123", password: "BigDoubleWoop!321", phone: "7208116942", name: "Guy Big"})
        .end((err, res) => {
          expect(res).to.have.status(200);
          assert.strictEqual(res.text.includes("Registered successfully!"), true);
          done();
        });
    });
    it('Negative : /register. Checking invalid name', done => {
      chai
        .request(server)
        .post('/register')
        .send({username: "Big_Guy_123", password:"BigDoubleWoop!321", phone: "7208116942", name: "Guy Big"})
        .end((err, res) => {
          expect(res).to.have.status(200);
          assert.strictEqual(res.text.includes('Registration failed: username already exists.'), true);
          done();
        });
    });
  });

describe('Testing Login API', () => {
    it('Positive : /login', done => {
        chai
        .request(server)
        .post('/login')
        .send({username: "Big_Guy_123", password: "BigDoubleWoop!321"})
        .end((err, res) => {
          expect(res).to.have.status(200);
          assert.strictEqual(res.text.includes('Successfully Logged in!'), true);
          done();
        });
    });
    it('Negative : /login. Checking invalid name', done => {
      chai
        .request(server)
        .post('/login')
        .send({username: "skooby_doo", password:"doobee dah"})
        .end((err, res) => {
          expect(res).to.have.status(200);
          assert.strictEqual(res.text.includes('User does not exist. Register an account or try again.'), true);
          done();
        });
    });
  });

  describe('Testing Favorite API', () => {
    it('Positive : /favorite', done => {
        chai
        .request(server)
        .post('/favorite')
        .send({song_id: "1OJxI8lIWRqBvouJxW1nzN", song_name: "Subwoofer Lullaby", artist_name: "C418", album_name: "Minecraft - Volume Alpha", album_url: "https://i.scdn.co/image/ab67616d0000b273aaeb5c9fb6131977995b7f0e", song_duration: "3:28"})
        .end((err, res) => {
          const b = res.text !== null;
          assert.strictEqual(b, true);
          done();
        });
    });
    chai.request(server).get('/logout');
    it('Negative : /favorite. Check user is signed in', done => {
      chai
        .request(server)
        .post('/favorite')
        .send({song_id: "1OJxI8lIWRqBvouJxW1nzN", song_name: "Subwoofer Lullaby", artist_name: "C418", album_name: "Minecraft - Volume Alpha", album_url: "https://i.scdn.co/image/ab67616d0000b273aaeb5c9fb6131977995b7f0e", song_duration: "3:28"})
        .end((err, res) => {
          assert.strictEqual(res.text.includes('Login'), true);
          done();
        });
    });
  });