'use strict';

// Require packages
var gulp       = require('gulp');
var babel 	   = require('gulp-babel');
var sass       = require('gulp-sass');
var concat     = require('gulp-concat');
var uglify     = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');


// Define the default task that's run on `gulp`
gulp.task('default', ['build-css','build-js','watch']);

// Configure which files to watch and what tasks to use on file changes
gulp.task('watch', function() {
  gulp.watch('src/js/**/*.js', ['build-js']);
  gulp.watch('src/scss/**/*.scss', ['build-css']);
});

// Concatenate all SCSS files in scss, generate sourcemaps, minify it and output to assets/css/app.min.css
gulp.task('build-css', function() {
  return gulp.src('src/app.scss')
    .pipe(sourcemaps.init())
    .pipe(concat('form-validation.css'))
    .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/css'));
});

// Concatenate all Javascript files in js, generate sourcemaps, minify it and output to assets/js/app.min.js
gulp.task('build-js', function() {
  return gulp.src('src/js/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('form-validation.min.js'))
    .pipe(sourcemaps.write())
	  .pipe(babel({presets: ['env']}))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'));
});