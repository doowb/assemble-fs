'use strict';

require('mocha');
var path = require('path');
var assert = require('assert');
var rimraf = require('rimraf');
var App = require('templates');
var afs = require('..');
var app;

var fixtures = path.join(__dirname, 'fixtures/copy/*.txt');
var outpath = path.join(__dirname, 'out-fixtures');

describe('copy()', function() {
  beforeEach(function(cb) {
    rimraf(outpath, cb);
    app = new App();
    app.use(afs());
  });

  afterEach(function(cb) {
    rimraf(outpath, cb);
  });

  describe('streams', function() {
    it('should copy files', function(cb) {
      app.copy(fixtures, path.join(__dirname, 'actual'))
        .on('data', function(file) {
          assert.equal(typeof file, 'object');
        })
        .on('end', cb);
    });
  });
});
