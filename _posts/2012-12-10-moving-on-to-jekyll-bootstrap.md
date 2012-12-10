---
layout: post
title: "Moving on to Jekyll Bootstrap"
description: ""
category: blag 
tags: ["jekyll", "bootstrap"]
---
{% include JB/setup %}

So, I finally decided to port this site to Jekyll-Bootstrap along with a bunch of other projects. There are some helper functions in Jekyll Bootstrap that I find very convenient to use. Particularly since I'm using ruby/rake all the time, it's easier to just run the `rake post` command to just post whatever you need to. I'll add a few more things in the future. Right now, I'm just testing a bunch of things and didn't exactly pay much attention to making the site look good.

Not exactly sure why this wasn't done before but I added something minor to the jekyll bootstrap `Rakefile` - creating posts with categories from the commandline itself. Basically, `rake post title="My Title" category=blag tags=jekyll,bootstrap`. Feel free to pull the [source](http://github.com/prasincs/prasincs.github.com) and use it in your Jekyll-Bootstrap site.
