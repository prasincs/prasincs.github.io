---
layout: post
title: Abusing Git pre-commit hooks for fun and profit
categories:
- git
- blog
- jekyll
---

So, [git pre-commit hooks](http://book.git-scm.com/5_git_hooks.html) are executable files (yes, you have to declare them as `chmod +x` - for some reason I forget this every time I write hooks) that are run right before you commit. This type of stuff lets you verify that your application is working, run a few tests, etc before it gets committed. At least the current use case I have (that probably illustrates the point of this particular hook fairly well) is related to this website. So, as I started working on this, I realized that categories are implmented as user plugins which aren't allowed by github-pages for security reasons. Since all I'm doing is generating a static website, that doesn't really matter as long as I copy the categories directory to the root, right? Why not automate that shit?

First I wrote a script "./run_extensions" with 

{% highlight bash %}
#!/bin/bash
rvm use 1.9.2
bundle install
bundle exec ejekyll
cp -rf _site/categories .
git add .
{% endhighlight %}

not too surprising - I initialize rvm environment (I have that set in both bash and zsh shells that I use but it's better to be explicit), `bundle install` and `bundle exec ejekyll` commands install the dependencies declared in the `Gemfile` and then run the static website generation using Jekyll. Now that I have plugins goodness, I can copy the categories folder from `_site` and make sure everything is staged.

Now the next step would be to make the pre-commit hook itself. So, the pre-commit hook runs from the parent directory of .git folder itself and can be anything. I have a bash script. The location is .git/hooks/pre-commit

{% highlight bash %}
#!/bin/bash
./run_extensions.sh
{% endhighlight %}

after this, make sure to run `chmod +x .git/hooks/pre-commit` so that it's executable. From now all, each commit is going to generate all the necessary categories structure.
