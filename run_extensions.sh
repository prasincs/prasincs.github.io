#!/bin/bash
rvm use 1.9.2
bundle install
bundle exec ejekyll
cp -r categories/* categories/
