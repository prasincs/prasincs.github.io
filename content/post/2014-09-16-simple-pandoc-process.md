---
categories:
- blag
date: 2014-09-16T00:00:00Z
description: ""
tags:
- pandoc
- reviews
- papers
title: Simple Pandoc process
url: /2014/09/16/simple-pandoc-process/
---



So, I recently signed up for a Distributed Systems course at UConn (http://www.engr.uconn.edu/~mok11002/public_html/cse5095_fall2014.htm). It involves a lot of reading and writing reviews. I have always written these class assignments in LaTeX except when I have been expressedly forbidden from using it. However, there's a whole gamut of problems with writing in LaTeX directly. Partly, you may not always be in a place where your environment is sane. So, being able to store as plaintext/markdown would be awesome. Here's what I do for the reviews:

* Every file named after the day it is due -- so I don't have to remember the name of the paper or some other arbitrary thing.

* Pandoc runs and generates PDF


So, a file for a project due on Sept 9th may look like this `sept_9.md` and upon run the pandoc command `pandoc -V geometry='margin=1in' -f markdown -o sept_9.pdf sept_9.md && open sept_9.pdf` your PDF viewer will show you the result. Caveat, this is on a mac, if you are on Linux replace open with xdg-open.

## Makefile

So to make the process even more seamless, I have a Makefile that matches on the basename and compiles it for you:

```
%: %.md
  pandoc -V geometry='margin=1in' -f markdown -o $*.pdf $*.md && open $*.pdf
```

So now I just need to run `make sept_9` and an updated PDF of that day opens up. I can extend it to support all the format pandoc supports but I'll leave that until I absolutely must.
