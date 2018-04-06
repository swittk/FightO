#!/bin/bash

browserify phyndex.js -o phyndexes5.js -t [ babelify --presets babel-preset-es2015 ]