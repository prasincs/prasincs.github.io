---
layout: post
title: Abusing Git pre-commit hooks for fun and profit
categories:
- git
- blog
- jekyll
---

So, git pre-commit hooks are executable files (yes, you have to declare them as `chmod +x` - for some reason I forget this every time I write hooks) that are run right before you commit. This type of stuff lets you verify that your application is working, run a few tests, etc before it gets committed. 
