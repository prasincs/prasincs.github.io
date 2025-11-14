---
categories:
- mesos
date: 2015-05-20T00:00:00Z
description: Using Mesos UI for checking slaves and such
draft: true
tags:
- ssh
- mesos
- distributed systems
- how to
title: 'Practical Mesos: Accessing server UI behind firewall'
url: /2015/05/20/practical-mesos-accessing-server-ui-behind-firewall/
---



So, to be clear this post doesn't have all that much to do with Mesos or anything but since trying to figure out how I can access the Mesos Slave UI's ports when I'm traveling out of office is what led me to remember using SOCKS proxy to access servers behind firewalls. So if you googled something along what was in the title, I hope this post is useful.

## Problem

So, you may have a Mesos cluster setup in a way that allows you to access the mesos-master somehow. It's almost never desirable to expose web endpoints to more nodes than you need, so likely the slave nodes' ports aren't directly accessible to you even if the master's is. If all your servers are accessible in local environment, you don't have to do anything else.


## Architecture: Mesos behind a Firewall

Suppose you have the following architecture with 5 servers. You have one server with a public IP address and incidentally on the same subnet as your private servers (more realistically they'd probably also be in different subnets/VLANs, but lets assume your host knows about these servers).

![Mesos cluster behind Firewall](/assets/images/mesos/mesos-arch-firewalled.png)

Now lets look at the ports these servers will have open for Mesos.

- public-host (none, only ssh port - assuming you have access to this one)
- mesos-master-0 (5050)
- mesos-slave-[0-2] (5051)

Now if you just want to access the web UI on the master you can do static port forwarding:

`ssh -L5050:mesos-master-0:5050 public-host`

Now you're able to access the UI at `http://localhost:5050`. However, the very first time you access a slave's info to see why a job failed in a particular slave, you'll be greeted by connection error and blank page. What's happening?

1. DNS failure
2. Access failure

Regarding point 1, your computer has no idea any of these host names, it wouldn't really help you if you added the host names in your `/etc/hosts` file because of point 2 -- you don't have access to the servers by design.

### Why are slave info inaccessible from Master?

Ok, so you must be thinking, why can't I just get the mesos master to show/collect all the slave information too? Lets think through this. If we were to enable that and you have 3 mesos slaves, your Mesos master is now responsible for managing files and acting like a load-balancer. That's not exactly why you would using Mesos in first place. And, your files could be HUGE for `stderr` and `stdout` files. Current way is much simpler, your Mesos Master and Slave just handle getting you access to the file in the system -- and then `sendfile()` takes care of everything. :)
