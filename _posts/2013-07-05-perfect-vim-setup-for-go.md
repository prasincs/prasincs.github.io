---
layout: post
title: "Perfect Vim Setup for Go"
description: ""
category:  
tags: ["vim", "golang"]
---
{% include JB/setup %}

So, the more I use Go, more I like what I'm getting. It's one of the very few languages that guides you to write better code right off the bat by making it easy and not pedantic. I have a big rant in my head about this but I'll save you the pain. 

This was one thing my vim setup was missing. As my go programs became bigger, I kept thinking, I'd really like better autocomplete and, heck, even syntax highlighting. I'll focus on two ways to do this for vim, one without using Pathogen, Vundle and one using Pathogen ( I don't use Vundle but the idea is the same ). 

## Your Golang setup

I tend to install go from source (the build system is actually pretty fascinating, but I'll save that for later). So, assuming your go binaries are stored in `/opt/golang`, you want these settings in your `$HOME/.bashrc` or similar files. My `$GOPATH` is generally at `$HOME/.go` keeping in convention with lots of other programming languages, tools I use.

    export GOROOT=/opt/golang
    export GOPATH=$HOME/.go
    export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

## Syntax Highlighting

### Without using Pathogen

If you don't use Pathogen or Vundle to manage your vim config, thankfully the official install from Google comes with vim config right out of the box. Head on over to `$GOROOT/misc/vim`

You'll see something like this

    autoload  ftdetect  ftplugin  indent  plugin  readme.txt  syntax

That's a vim setup, now just copy that to your `$HOME/.vim` directory and you have filetype detection and syntax highlighting goodness.

### Using Pathogen

So, if you're an experienced vim w/ pathogen user, you'd have figured out that you could totally dump that into a git repo and put in your bundle. You could do that or use someone else's over at [github.com/jnwhiteh/vim-golang](https://github.com/jnwhiteh/vim-golang).

    cd ~/.vim/bundle
    git clone git@github.com:jnwhiteh/vim-golang.git

Or if you're like me and use submodules

    cd ~/vim-config
    git submodule add git@github.com:jnwhiteh/vim-golang.git vim/bundle/golang

Using Vundle is the same idea, except you add the git repository in your config file.

## OmiComplete support 

Remember in step 1 where we added the `$GOPATH/bin` in your `$PATH` variable? This is where it will come handy. So, if you've ever run the `go get` command to get packages, if the package delcares an executable, it will be placed in the bin directory. In our case, it's an autocompletion daemon called [gocode](https://github.com/nsf/gocode).

### Without Pathogen

Thankfully, similar to `golang` itself, `gocode` comes with vim files for support out of the box. So, you can just copy the contents from there

    go get -u github.com/nsf/gocode
    cp -r gocode/vim/* $HOME/.vim

The vim scripts just look for `gocode` binary in the shell, you should be all set.

### With Pathogen

There's a repo that's amenable to using with pathogen at [github.com/Blackrush/vim-gocode](http://github.com/Blackrush/vim-gocode). It's the same process as the enabling syntax highlighting, just clone or get the repo as a submodule.

    cd ~/.vim/bundle
    git clone git@github.com:Blackrush/vim-gocode.git

Or

    cd ~/vim-config
    git submodule add git@github.com:Blackrush/vim-gocode.git vim/bundle/gocode


So, now you should have Omnicomplete support for it.. if you have SuperTab installed, it should be mapped to Tab key otherwise `<C-x><C-o>` would work for autocomplete goodness.


## Other plugins to look at 

* [Syntastic](https://github.com/scrooloose/syntastic) - does syntax detection and when combined with TagBar is pretty awesome

* [TagBar](https://github.com/majutsushi/tagbar) - a better way to represent `exuberant-ctags` generated tags for your files, also supports `jsctags` for javascript files .. or maybe it's other way around

* [Gotags](https://github.com/jstemmer/gotags) - A ctags compatible tags generator for go.. it's still rough on the edges.

## End Result

So, here's what my current vim setup looks like for Go. I'm experimenting with gotags right now. It's not quite ready yet. It segfaulted vim once for me, so I'm somewhat reluctant to hype it up too much.

![Go Screenshot](/assets/images/vim-go-setup-screenshot.png)

If you want the exact setup like mine -- with Powerline, Syntastic, etc.. feel free to clone/fork my vim-config at [https://github.com/prasincs/vim-config](https://github.com/prasincs/vim-config).
