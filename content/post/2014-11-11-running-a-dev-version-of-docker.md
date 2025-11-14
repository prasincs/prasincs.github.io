---
categories:
- blag
date: 2014-11-11T00:00:00Z
description: ""
tags:
- docker
- source
title: Running a dev version of docker
url: /2014/11/11/running-a-dev-version-of-docker/
---



I have recently been working on fixing some personal pain-points for Docker. It
came about because of a course I am taking at UConn this fall on
[Troubleshooting Distributed
Systems](http://www.engr.uconn.edu/~mok11002/public_html/cse5095_fall2014.htm) -
Excellent course by the way.

The current issue I'm looking at is the one about
[logging](https://github.com/docker/docker/issues/7195). Yep, I somehow managed
to volunteered to do this in a month with a full-time job and 4 hours a week of driving
back and forth from UConn. Anyway, I needed to run a dev version of Docker in my
local machine alongside the stable version. I'm on a mac running boot2docker.
There are [other
ways](http://www.siliconfidential.com/articles/docker-coreos-osx/) to do this
but I find boot2docker sufficient for almost all the work I'd want to do in this
case.

## Compiling Docker

Basically, follow the instruction in
http://docs.docker.com/contributing/devenvironment/. The short form of it is:

    git clone git@github.com:docker/docker.git
    cd docker
    make BINDDIR=. cross

Docker compiles itself in a docker container (of course) and it was a seamless
operation aside from the fact that I could not access the binaries after the
compilation was done. The problem is that your `BINDDIR` is not set to the
current directory. I have come to run the make command with that environment
variable, for tasks other than tests.


You will find the compiled versions in the following directory structure
 (inside the `bundles` directory)


    bundles
    ├── 1.3.1
    │   └── binary
    │       ├── docker -> docker-1.3.1
    │       ├── docker-1.3.1
    │       ├── docker-1.3.1.md5
    │       └── docker-1.3.1.sha256
    └── 1.3.1-dev
        ├── binary
        │   ├── docker -> docker-1.3.1-dev
        │   ├── docker-1.3.1-dev
        │   ├── docker-1.3.1-dev.md5
        │   └── docker-1.3.1-dev.sha256
        └── cross
            ├── darwin
            │   ├── 386
            │   │   ├── docker -> docker-1.3.1-dev
            │   │   ├── docker-1.3.1-dev
            │   │   ├── docker-1.3.1-dev.md5
            │   │   └── docker-1.3.1-dev.sha256
            │   └── amd64
            │       ├── docker -> docker-1.3.1-dev
            │       ├── docker-1.3.1-dev
            │       ├── docker-1.3.1-dev.md5
            │       └── docker-1.3.1-dev.sha256
            ├── freebsd
            │   ├── 386
            │   │   ├── docker -> docker-1.3.1-dev
            │   │   ├── docker-1.3.1-dev
            │   │   ├── docker-1.3.1-dev.md5
            │   │   └── docker-1.3.1-dev.sha256
            │   ├── amd64
            │   │   ├── docker -> docker-1.3.1-dev
            │   │   ├── docker-1.3.1-dev
            │   │   ├── docker-1.3.1-dev.md5
            │   │   └── docker-1.3.1-dev.sha256
            │   └── arm
            │       ├── docker -> docker-1.3.1-dev
            │       ├── docker-1.3.1-dev
            │       ├── docker-1.3.1-dev.md5
            │       └── docker-1.3.1-dev.sha256
            └── linux
                ├── 386
                │   ├── docker -> docker-1.3.1-dev
                │   ├── docker-1.3.1-dev
                │   ├── docker-1.3.1-dev.md5
                │   └── docker-1.3.1-dev.sha256
                ├── amd64
                │   ├── docker -> ../../../binary/docker
                │   ├── docker-1.3.1-dev -> ../../../binary/docker-1.3.1-dev
                │   ├── docker-1.3.1-dev.md5 -> ../../../binary/docker-1.3.1-dev.md5
                │   └── docker-1.3.1-dev.sha256 -> ../../../binary/docker-1.3.1-dev.sha256
                └── arm
                    ├── docker -> docker-1.3.1-dev
                    ├── docker-1.3.1-dev
                    ├── docker-1.3.1-dev.md5
                    └── docker-1.3.1-dev.sha256

Since I'm using a Macbook Pro - when I try to run `./bundles/1.3.1-dev/cross/darwin/amd64/docker ps` I get

    2014/11/11 04:17:49 Error response from daemon: client and server don't have same version (client : 1.16, server: 1.15)

This means the versions of client and servers do not match. Now I don't really want to replace the stable docker instance running in `boot2docker`.

The solution is slightly hacky but works well enough for what I need.

# Move Docker binary to the VM

This would be similar for other systems too - I'm going to assume `boot2docker` for simplicity again

## Find boot2docker ssh port

It's mostly `2022` but doesn't hurt to look


    $ boot2docker info

    {
      "Name": "boot2docker-vm",
      "UUID": "c0bad522-2c24-4a96-bf54-d2c0225be3a2",
      "Iso": "/Users/nextdooerhacker/.boot2docker/boot2docker.iso",
      "State": "running",
      "CPUs": 8,
      "Memory": 2048,
      "VRAM": 8,
      "CfgFile": "/Users/nextdoorhacker/VirtualBox VMs/boot2docker-vm/boot2docker-vm.vbox",
      "BaseFolder": "/Users/nextdoorhacker/VirtualBox VMs/boot2docker-vm",
      "OSType": "",
      "Flag": 0,
      "BootOrder": null,
      "DockerPort": 0,
      "SSHPort": 2022,
      "SerialFile": "/Users/nextdoorhacker/.boot2docker/boot2docker-vm.sock"
    }%



If you want to script it, I recommend the excellent jq tool to get the number.
There are ways to do this with awk/sed/grep tools too.

    bot2docker info | jq '.SSHPort'
    2022

Lets save that to a variable

    PORT=$(boot2docker info | jq '.SSHPort')

## Move the binaries to boot2docker

From your docker directory, the following command:

    scp -r -P $PORT bundles/1.3.1-dev/cross/linux/amd64/ docker@localhost:

The password according to https://github.com/boot2docker/boot2docker is
`tcuser`.

## SSH into boot2docker

This should drop you into the boot2docker shell

    boot2docker ssh

## Run the dev docker instance

I picked the port `2378` pretty much arbitrarily here. I wanted to run with
just changing the `DOCKER_HOST` variable. Unless I'm hacking on the TLS part, I
shouldn't have to change that.  This is the command I run:

    cd amd64
    sudo ./docker -d -D -g . -H unix:// -H tcp://0.0.0.0:2378 --tlsverify --tlscacert=/var/lib/boot2docker/tls/ca.pem --tlscert=/var/lib/boot2docker/tls/server.pem --tlskey=/var/lib/boot2docker/tls/serverkey.pem -p docker.pid

Only things that have changed are

* the `-D` argument for debug mode - I find it useful to have it running. Docker is not that verbose to bother me
* the pidfile to be in the current directory

## Using the new client

Now prefix with the new port number -- everything else will remain the same.

    DOCKER_HOST=tcp://192.168.59.103:2378 ./bundles/1.3.1-dev/cross/darwin/amd64/docker run -t -i ubuntu  /bin/bash
    root@c886080a6024:/#

Congrats you have a dev version of docker running. Commence hackery!
