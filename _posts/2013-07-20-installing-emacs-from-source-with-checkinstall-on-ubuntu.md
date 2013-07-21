---
layout: post
title: "Installing Emacs 24.2 from source with Checkinstall on Ubuntu 13.04"
description: ""
category:  
tags: [ "emacs", "vim", "ubuntu"]
---
{% include JB/setup %}

**Caveat** This isn't very well written, I might revisit this at some point. These are really just my notes in installing emacs and some reasons why I'm going out of the vim world in response to some crazy issues I'm having.

I recently decided that I should give Emacs another go. As you might know based on my posts that I really like vim. It's just simple and easy to find everywhere. Great for sysadmins and programmers alike. What I've been finding is the same kind of bloat that I saw in Emacs years before. As I kept adding more languages and features to use Vim as more of an IDE (for clojure specifically), these warts became more apparently. For example, I was segfaulting my vim editor every once in a while while editing Clojure because something odd was happening with my syntax analyzing plugin and the vim buffer. 
There are additional problems with Vim and Clojure that I found.. say, you absentmindedly wrote a code like this. I use the magnificent Vim Fireplace plugin to code in Clojure.

    (loop [i 0]
      (recur (inc i)))

And sent it out to execution, there's no way for you to get back control of the console again.. it's going on an infinite loop with no turning back. Okay, I might have gotten spoiled by my Erlang `erl` repl interface where I can Ctrl+G out of most of my woes, I believe that as Vim becomes ever closer to becoming an IDE for developers, it needs to incorporate ways to handle these kinds of use cases. I'm well aware of the warning in the [Fireplace documentation](http://clojure-doc.org/articles/tutorials/vim_fireplace.html) to not do what I just said, it's a contrived example for sure but real code has unexpected behaviors when you're checking how it works.

That said, what I do like about vim are the movements. I'm planning to map the `hjkl` movements back to emacs, everything else be damned. I have gone through the tutorial for emacs but somehow the Ctrl keybindings and stress on my pinky just makes me give up emacs. I also don't quite like that emacs is modeless, I think that ends you up with a lot of `C-x` and `M-x` combinations that could've been avoided. I'll be writing more on this as I explore how I adjust in this brave new world.

Now that I've ranted and unnecessarily over-explained myself, here goes what I wanted to write in the first place. How you can install emacs from source and still get apt-get uninstall if you need to. You use the checkinstall package to do this. Emacs is just what I happened to be using and from my previous experiences working with emacs, I've found the best way to install emacs is to do it from source. Particularly important if you're going to make it custom and want it to run on multiple platforms with realistic expectations. (Same idea holds with Vim too - especially if you want to support python interop for plugins like `Ctrl+P`). This post is an attempt to keep track of what I'm doing with Emacs and adapting as a prolific vim user struggling to keep all the niceness vim has in the emacs land.

## Getting Emacs source

You can download emacs source using 

    wget http://alpha.gnu.org/gnu/emacs/pretest/emacs-24.2.90.tar.gz
    tar -xzvf emacs-24.2.90.tar.gz

## Get the packages

So, if you're a developer -- this might be unnecessary but do this anyway if you run into trouble in any future steps. I was doing this on a fresh-ish installation of Ubuntu 13.04 on my home desktop. I have included the `checkinstall` package here already. I'll explain further about checkinstall.


    sudo apt-get install texinfo build-essential automake autoconf libdbus-1-dev libgconf2-dev libgif-dev libgpm-dev libgtk2.0-dev libjpeg62-dev libm17n-dev libncurses5-dev libotf-dev librsvg2-dev libtiff5-dev libXpm-dev checkinstall.


## Install

This is definitely the easiest part, assuming things don't break on you randomly.

    ./configure
    make bootstrap
    make
    # You could check if it runs by executing src/emacs
    sudo checkinstall
    # You will get a bunch of questions... pretty self explanatory

## Uninstalling

So, this is the whole reason for using Checkinstall to install emacs or other packages that you need to get from source for one reason or other. You can just do `dpkg -r emacs`

If you want to install your emacs side by side with another one, you might want to change  the name and give a different path in the `./configure` step.





