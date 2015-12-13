/*!
 * assemble-fs <https://github.com/jonschlinkert/assemble-fs>
 *
 * Copyright (c) 2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

'use strict';

var utils = require('./utils');

/**
 * Plugin is registered on `app` and `collection` instances
 */

module.exports = function() {
  return function(app) {
    plugin(app);
    return function(collection) {
      plugin(collection);
    };
  };
};

/**
 * The actual `fs` plugin
 */

function plugin(app) {
  var vfs = utils.vfs;

  // assume none of the handlers exist if `onStream` does not exist
  if (typeof app.handler === 'function' && typeof app.onStream !== 'function') {
    app.handler('onStream');
    app.handler('preWrite');
    app.handler('postWrite');
  }

  /**
   * Copy files with the given glob `patterns` to the specified `dest`.
   *
   * ```js
   * app.task('assets', function(cb) {
   *   app.copy('assets/**', 'dist/')
   *     .on('error', cb)
   *     .on('finish', cb)
   * });
   * ```
   * @name .copy
   * @param {String|Array} `patterns` Glob patterns of files to copy.
   * @param  {String|Function} `dest` Desination directory.
   * @return {Stream} Stream, to continue processing if necessary.
   * @api public
   */

  app.mixin('copy', function(patterns, dest, options) {
    return this.src(patterns, options)
      .pipe(this.dest(dest, options))
  });

  /**
   * Glob patterns or filepaths to source files.
   *
   * ```js
   * app.src('src/*.hbs', {layout: 'default'});
   * ```
   * @name .src
   * @param {String|Array} `glob` Glob patterns or file paths to source files.
   * @param {Object} `options` Options or locals to merge into the context and/or pass to `src` plugins
   * @api public
   */

  app.mixin('src', function() {
    return vfs.src.apply(vfs, arguments)
      .pipe(toCollection(app))
      .pipe(handle(app, 'onStream'))
  });

  /**
   * Glob patterns or paths for symlinks.
   *
   * ```js
   * app.symlink('src/**');
   * ```
   * @name .symlink
   * @param {String|Array} `glob`
   * @api public
   */

  app.mixin('symlink', function() {
    return vfs.symlink.apply(vfs, arguments);
  });

  /**
   * Specify a destination for processed files.
   *
   * ```js
   * app.dest('dist/');
   * ```
   * @name .dest
   * @param {String|Function} `dest` File path or rename function.
   * @param {Object} `options` Options and locals to pass to `dest` plugins
   * @api public
   */

  app.mixin('dest', function(dir) {
    if (!dir) {
      throw new TypeError('expected dest to be a string or function.');
    }
    return handle(app, 'preWrite')
      .pipe(vfs.dest.apply(vfs, arguments))
  });
}

/**
 * Plugin for handling middleware
 *
 * @param {Object} `app` Instance of "app" (assemble, verb, etc) or a collection
 * @param {String} `stage` the middleware stage to run
 */

function handle(app, stage) {
  return utils.through.obj(function(file, enc, next) {
    if (typeof app.handle !== 'function') {
      return next(null, file);
    }
    if (typeof file.options === 'undefined') {
      return next(null, file);
    }
    if (file.isNull()) return next();
    app.handle(stage, file, next);
  });
}

/**
 * Push vinyl files into a collection or list.
 */

function toCollection(app, name) {
  name = name || 'streamFiles';
  var collection, view;

  if (app.isApp) {
    collection = app[name] || app.create(name);
  }

  var stream = utils.through.obj(function(file, enc, next) {
    if (file.isNull()) {
      return next();
    }

    if (app.isApp) {
      view = collection.setView(file.path, file);
    } else if (app.isCollection || app.isViews) {
      view = app.setView(file.path, file);
    } else if (app.isList) {
      view = app.setItem(file.path, file);
    } else {
      return next(new Error('assemble-fs expects an instance, collection or view'));
    }

    next(null, view);
  });

  app.stream = utils.src(stream);
  return stream;
}
