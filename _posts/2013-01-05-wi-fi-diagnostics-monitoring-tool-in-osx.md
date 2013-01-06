---
layout: post
title: "Wi Fi Diagnostics, monitoring tool in OSX"
description: "Hidden OSX tool"
category:  
tags: [wifi, osx , diagnostics]
---
{% include JB/setup %}

I recently found this hidden/undocumented tool (at least not in Network Preferences) in OSX while trying to debug some wireless connectivity issues at the house. Most modern Linux distributions already come with a few of these tools to do monitoring, watching when the network drops, or just monitoring signal vs noise ratio. I wont go into the detail of how to do that with Linux (perhaps another blog topic). If you want to checkout the Linux side, you might want to start  [here](http://www.techrepublic.com/blog/networking/nuts-about-nets-wi-fi-diagnostic-tools-with-a-difference/2759) .

So, where is this tool and what can you do with it? The app is named  as-you-might-expect `Wi-Fi Diagnostics` and you can find it at `/System/Library/CoreServices/Wi-Fi\ Diagnostics.app/`

Open your favorite terminal application. Mine is [iTerm2][iterm2] and type

    /System/Library/CoreServices/Wi-Fi\ Diagnostics.app/Contents/MacOS/Wi-Fi\ Diagnostics

You'll be greeted by this screen 

![Screen 1](/assets/images/osx-wifi-diagnostic-screen-1.png)

So far, I've only tried using the `Monitor Performance` -- I tried others but lost interest... it's good to know that it's possible to easily record events and turn on debug logs though. Here's what my screen looks like, in the beginning 

![Screen 2](/assets/images/osx-wifi-diagnostic-screen-2.png)

However, the cool thing about `Monitor Performance` option is that at the end of the session, it saves a tar.gz file in your desktop. 

It's named something like `/Users/<username>/Desktop/Wi-Fi Diagnostics Data-20130105-1825.tgz`. Lets look inside. 

There's a plist file named `com.apple.wifi.diagnostics.plist` in the archive... you can easily parse that using [plistlib](http://docs.python.org/2.7/library/plistlib.html), I'd make a graph but my wifi is too stable. :(

[iterm2]: http://www.iterm2.com/#/section/home 
