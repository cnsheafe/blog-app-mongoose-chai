const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {runServer, app,closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
chai.use(chaiHttp);

function seedBlogPostData() {
  console.info('seeding blog data');
  const seedData = [];
  for(let i=1; i<=10; i++) {seedData.push(generateBlogPostData());}
  return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
  return {
    title: generateBlogPostTitle(),
    content: faker.lorem.paragraph(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    created: Date.now()
  };
}

function generateBlogPostTitle() {
  const titles = ['Clickbait #1', 'Clickbait #2', 'Clickbait #3'];
  return titles[Math.floor(Math.random() * titles.length)];
}

function deleteDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}


describe('Blog Posts API resource', () => {
  before(() => { return runServer(TEST_DATABASE_URL); });
  beforeEach(() => { return seedBlogPostData(); });
  afterEach(() => { return deleteDb(); });
  after (() => { return closeServer(); });

  describe('GET endpoint', () => {
    it('should return all posts if no id is specified', () => {
      let res = {};
      return chai.request(app).get('/posts')
      .then(_res => {
        res = _res;
        res.should.have.status(200);
        res.body.should.have.length.of.at.least(1);
        return BlogPost.count();
      })
      .then(count => res.body.should.have.length.of(count));
    });
      it('should return post with the same id, if provided', () => {
        let testId;
        return BlogPost.findOne()
        .then(post => {return post.id;})
        .then(id => {
          testId = id;
          console.log(id);
          return chai.request(app).get(`/posts/${testId}`);
        })
        .then(res => {
          console.log(res.body);
          res.should.have.status(200);
          res.body.id.should.equal(testId);
        });
      });
  });

  describe('POST endpoint', () => {
    it('should create a new post', () => {
      const testPost = generateBlogPostData();
      return chai.request(app)
      .post('/posts')
      .send(testPost)
      .then(res => {
        res.should.have.status(201);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.include.keys('id','author', 'content', 'title', 'title', 'created');
        res.body.id.should.not.be.null;
        res.body.content.should.equal(testPost.content);
        res.body.title.should.equal(testPost.title);
        console.log(res.body.author);
        console.log(testPost.author);
        return res.body.author.split(' ');
      })
      .then(author => {
        author[0].should.equal(testPost.author.firstName);
        author[1].should.equal(testPost.author.lastName);
      });
    });
  });

  describe('PUT endpoint', () => {
    it('should update an existing post', () => {
      const updatedPost = generateBlogPostData();
      return BlogPost.findOne().
      then(post => {
        updatedPost.id = post.id;
        return;
      })
      .then(() => {
        return chai.request(app)
        .put(`/posts/${updatedPost.id}`)
        .send(updatedPost)
        .then(res => {
          res.should.have.status(201);
          res.should.be.json;
          res.body.id.should.not.be.null;
          res.body.content.should.equal(updatedPost.content);
          res.body.title.should.equal(updatedPost.title);
          return res.body.author.split(' ');
        })
        .then(author => {
          author[0].should.equal(updatedPost.author.firstName);
          author[1].should.equal(updatedPost.author.lastName);
        });
      });
    });
  });

  describe('DELETE endpoint', () => {
    it('should delete an existing post via /posts', () => {
      let testId;
      return BlogPost.findOne().exec()
      .then(post => {return post.id;})
      .then(id => {
        testId = id;
        return chai.request(app)
        .delete(`/posts/${id}`)
        .then(res => {
          res.should.have.status(204);
          return BlogPost.findById(testId).exec();
        })
        .then(post => should.not.exist(post));
      });
    });

    it('should delete an existing post directly', () => {
      let testId;
      return BlogPost.findOne().exec()
      .then(post => {return post.id;})
      .then(id => {
        testId = id;
        return chai.request(app)
        .delete(`/${testId}`)
        .then(res => {
          res.should.have.status(204);
          return BlogPost.findById(testId).exec();
        })
        .then(post => should.not.exist(post));
      });
    });
  });
});
