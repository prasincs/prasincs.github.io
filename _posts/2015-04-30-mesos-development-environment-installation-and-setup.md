---
layout: post
title: "Mesos Development Environment Installation and setup"
description: ""
category:  "mesos"
tags: ["mesos", "distributed systems", "how to"]
---
{% include JB/setup %}

<div id="table-of-contents">
<h2>Table of Contents</h2>
<div id="text-table-of-contents">
<ul>
<li><a href="#sec-1">1. Mesos Development Environment Installation and setup</a>
<ul>
<li><a href="#sec-1-1">1.1. Questions</a>
<ul>
<li><a href="#sec-1-1-1">1.1.1. Why do you want to run Mesos?</a></li>
<li><a href="#sec-1-1-2">1.1.2. What Frameworks are you going to run on Mesos?</a></li>
</ul>
</li>
<li><a href="#sec-1-2">1.2. Background Readings</a></li>
<li><a href="#sec-1-3">1.3. Pre-requisites (Development Environment)</a>
<ul>
<li><a href="#sec-1-3-1">1.3.1. Zookeeper</a></li>
<li><a href="#sec-1-3-2">1.3.2. Mesos Masters</a></li>
<li><a href="#sec-1-3-3">1.3.3. Mesos Slaves</a></li>
<li><a href="#sec-1-3-4">1.3.4. Testing this Cluster with Spark</a></li>
</ul>
</li>
</ul>
</li>
</ul>
</div>
</div>



I realized recently that I have a somewhat non-standard setup for 
running/testing Mesos on my OSX system. Initially, I started this to see how well Mesos
compiles on OSX, but given that this setup has worked fine for me, I've been running it.
For a more accurate benchmark, I recommend running in VMs or some cloud provider.
 

## Questions<a id="sec-1-1" name="sec-1-1"></a>

This is a guide to getting started with setting up mesos on your local system
and soon, on a Cluster. First of all, you need to ask a few questions to
yourself. 

### Why do you want to run Mesos?<a id="sec-1-1-1" name="sec-1-1-1"></a>

Is it going to reduce any complexity that you are encountering, or introducing
more. Remember, making things more distributed without monitoring just adds more
things that can fail. That's not a reason to avoid building distributed systems,
but a good reason to look at monitoring and maintenance from the beginning.

### What Frameworks are you going to run on Mesos?<a id="sec-1-1-2" name="sec-1-1-2"></a>

There are various great frameworks that exist for mesos at the time of this
writing (January 28, 2015). It's not terribly hard to write one either &#x2013; if
you want a Clojure example, check out
<https://github.com/edpaget/riak-mesos>. There are better examples in Clojure
and Go. There are various meta-frameworks like Marathon and Aurora too. Kubernetes is gaining
a lot of popularity too now. I haven't run it on top of mesos yet, so I'm not sure how well it works.


## Background Readings<a id="sec-1-2" name="sec-1-2"></a>

These aren't required but I highly recommend checking them out.

-   Original Mesos Paper (<http://people.csail.mit.edu/matei/papers/2011/nsdi_mesos.pdf>)
-   Omega Paper (<http://research.google.com/pubs/pub41684.html>)
-   YARN vs Mesos (<http://www.quora.com/How-does-YARN-compare-to-Mesos> and <http://blog.typeobject.com/a-quick-comparison-of-mesos-and-yarn>)
-   Borg Paper (<http://static.googleusercontent.com/media/research.google.com/en/us/pubs/archive/43438.pdf>)

These are somewhat outdated at this point as the current mesos code also has
input from Wilkes and gang &#x2013; so it's closer to Mesos-Omega.

On the "might be too bleeding-edge-for-production" category.

-   Quasar from Stanford (<http://www.industry-academia.org/download/2014-asplos-quasar-Stanford-paper.pdf>) focuses on assigning resource allocation based on constraints for processes to get the best QoS. Mesos Frameworks like Aurora are moving towards this too.

## Pre-requisites (Development Environment)<a id="sec-1-3" name="sec-1-3"></a>

### Zookeeper<a id="sec-1-3-1" name="sec-1-3-1"></a>

You can run this as a single instance for development but given that mesos
depends on Zookeeper cluster to provide source of truth, you want to run these
as a cluster. Ideally 3 or 5 nodes.

    wget http://apache.cs.utah.edu/zookeeper/stable/zookeeper-3.4.6.tar.gz tar
    -xzvf zookeeper-3.4.6.tar.gz cd zookeeper-3.4.6

1.  Generate Zookeeper configuration

    You can manually try to do this but it's can be annoying if you're trying it for
    testing the servers. I use this project for doing
    that. <https://github.com/phunt/zkconf>, it's kind of complicated &#x2013; so I'll
    supply the relevant configuration files generated here.
    
        pip install cheetah cheetah compile *.tmpl python zkconf.py --count 3
        ~/work/mesos/zookeeper-3.4.6/conf/standalone-confs
    
    This will add some files in the given directory that will start the cluster for
    you. The default zookeeper connection string is
    
        localhost:2181,localhost:2182,localhost:2183
    
    Keep note of this &#x2013; this will be useful later for Mesos configuration.
    
    1.  Aside: Using Zookeeper from Clojure
    
        The best way to use Zookeeper from Clojure is to use the curator framework &#x2013; I
        have used the curator library for Clojure which is a wrapper around Apache
        Curator library. <https://github.com/pingles/curator>

### Mesos Masters<a id="sec-1-3-2" name="sec-1-3-2"></a>

Now, lets get Mesos. I'm assuming a fresh OSX installation &#x2013; (10.10 with
Homebrew).

    wget http://archive.apache.org/dist/mesos/0.21.0/mesos-0.21.0.tar.gz tar -zxvf
    mesos-0.21.0.tar.gz cd mesos-0.21.0 ./configure make export
    MESOS_HOME=/Users/pgautam/work/mesos/mesos-0.21.0 mkdir -p
    work-dir/{5050,5051,5052} mkdir -p log-dir/{5050,5051,5052}
    ./bin/mesos-master.sh --zk=zk://localhost:2181,localhost:2182,localhost:2183/mesos  --work_dir=$PWD/work-dir/5050 --quorum=2 --port=5050 --log_dir=$PWD/log-dir/5050
    ./bin/mesos-master.sh --zk=zk://localhost:2181,localhost:2182,localhost:2183/mesos --work_dir=$PWD/work-dir/5051 --quorum=2 --port=5051 --log_dir=$PWD/log-dir/5051
    ./bin/mesos-master.sh --zk=zk://localhost:2181,localhost:2182,localhost:2183/mesos --work_dir=$PWD/work-dir/5052 --quorum=2 --port=5052 --log_dir=$PWD/log-dir/5052

<http://mesos.apache.org/documentation/latest/configuration/>

<https://www.digitalocean.com/community/tutorials/how-to-configure-a-production-ready-mesosphere-cluster-on-ubuntu-14-04>

### Mesos Slaves<a id="sec-1-3-3" name="sec-1-3-3"></a>

We are only going to run one mesos slave this time because they're determined by
IP address to run on local system.

    cd mesos-0.21.0 ./bin/mesos-slave.sh --port=5053 --master=zk://localhost:2181,localhost:2182,localhost:2183/mesos

Note that you only have one slave with this method. Without slaves, there's no
"worker" to run the tasks on but it demonstrates the key concepts well.

### Testing this Cluster with Spark<a id="sec-1-3-4" name="sec-1-3-4"></a>

Now, you want to download Spark from <http://spark.apache.org/downloads.html> &#x2013;
Get the direct link.

    wget http://d3kbcqa49mib13.cloudfront.net/spark-1.2.0.tgz
    tar -xzvf spark-1.2.0.tgz
    cd spark-1.2.0
    ./make-distribution.sh --tgz

This will make a file "spark-1.2.0-bin-1.0.4.tgz", You can place this in HDFS
share, NFS mount, S3 or HTTP service and access it using "SPARK<sub>EXECUTOR</sub><sub>URI</sub>".
If it's your own cluster that runs Spark jobs often, you're better off just setting
"SPARK<sub>HOME</sub>" in the same place on every node, in an NFS mount or similar.

1.  Running Spark

    I'm assuming OSX here, for Linux it would be libmesos.so
    
        export MESOS_NATIVE_LIBRARY=$HOME/work/mesos/mesos-0.21.0/src/.libs/libmesos.dylib
        export SPARK_HOME=$HOME/work/mesos/spark-1.2.0
        export SPARK_MASTER_WEBUI_PORT=4040
        SPARK_MASTER_IP=10.1.10.47 SPARK_LOCAL_IP=127.0.0.1 ./bin/spark-shell --master mesos://zk://localhost:2181,localhost:2182,localhost:2183/mesos
    
    The "SPARK<sub>MASTER</sub><sub>IP</sub>" and "SPARK<sub>LOCAL</sub><sub>IP</sub>" are just declared so that they're
    explicitly detected and it's not all in loopback. This will also run a web UI on port 4040.
    
        15/02/02 15:02:51 INFO SparkILoop: Created spark context..
        Spark context available as sc.
        
        scala>
    
    Download the training files from
    <http://ampcamp.berkeley.edu/5/exercises/getting-started.html> and place them
    somewhere. I have them inside the "mesos" directory.  Lets try running the
    sample program.
    
        scala> val pagecounts = sc.textFile("../spark-training/data/pagecounts")
        15/02/02 15:02:55 INFO MemoryStore: ensureFreeSpace(32768) called with curMem=0, maxMem=278302556
        15/02/02 15:02:55 INFO MemoryStore: Block broadcast_0 stored as values in memory (estimated size 32.0 KB, free 265.4 MB)
        15/02/02 15:02:55 INFO MemoryStore: ensureFreeSpace(4959) called with curMem=32768, maxMem=278302556
        15/02/02 15:02:55 INFO MemoryStore: Block broadcast_0_piece0 stored as bytes in memory (estimated size 4.8 KB, free 265.4 MB)
        15/02/02 15:02:55 INFO BlockManagerInfo: Added broadcast_0_piece0 in memory on localhost:52212 (size: 4.8 KB, free: 265.4 MB)
        15/02/02 15:02:55 INFO BlockManagerMaster: Updated info of block broadcast_0_piece0
        15/02/02 15:02:55 INFO SparkContext: Created broadcast 0 from textFile at <console>:12
        pagecounts: org.apache.spark.rdd.RDD[String] = ../spark-training/data/pagecounts MappedRDD[1] at textFile at <console>:12
    
        scala> pagecounts.take(10).foreach(println)
        15/02/02 15:05:13 INFO SparkContext: Starting job: take at <console>:15
        15/02/02 15:05:13 INFO DAGScheduler: Got job 5 (take at <console>:15) with 1 output partitions (allowLocal=true)
        15/02/02 15:05:13 INFO DAGScheduler: Final stage: Stage 5(take at <console>:15)
        15/02/02 15:05:13 INFO DAGScheduler: Parents of final stage: List()
        15/02/02 15:05:13 INFO DAGScheduler: Missing parents: List()
        15/02/02 15:05:13 INFO DAGScheduler: Submitting Stage 5 (../spark-training/data/pagecounts MappedRDD[1] at textFile at <console>:12), which has no missing parents
        15/02/02 15:05:13 INFO MemoryStore: ensureFreeSpace(2560) called with curMem=60037, maxMem=278302556
        15/02/02 15:05:13 INFO MemoryStore: Block broadcast_6 stored as values in memory (estimated size 2.5 KB, free 265.4 MB)
        15/02/02 15:05:13 INFO MemoryStore: ensureFreeSpace(1902) called with curMem=62597, maxMem=278302556
        15/02/02 15:05:13 INFO MemoryStore: Block broadcast_6_piece0 stored as bytes in memory (estimated size 1902.0 B, free 265.3 MB)
        15/02/02 15:05:13 INFO BlockManagerInfo: Added broadcast_6_piece0 in memory on localhost:52212 (size: 1902.0 B, free: 265.4 MB)
        15/02/02 15:05:13 INFO BlockManagerMaster: Updated info of block broadcast_6_piece0
        15/02/02 15:05:13 INFO SparkContext: Created broadcast 6 from broadcast at DAGScheduler.scala:838
        15/02/02 15:05:13 INFO DAGScheduler: Submitting 1 missing tasks from Stage 5 (../spark-training/data/pagecounts MappedRDD[1] at textFile at <console>:12)
        15/02/02 15:05:13 INFO TaskSchedulerImpl: Adding task set 5.0 with 1 tasks
        15/02/02 15:05:13 INFO TaskSetManager: Starting task 0.0 in stage 5.0 (TID 5, 10.1.10.47, PROCESS_LOCAL, 1337 bytes)
        15/02/02 15:05:13 INFO BlockManagerInfo: Added broadcast_6_piece0 in memory on 10.1.10.47:52221 (size: 1902.0 B, free: 265.4 MB)
        15/02/02 15:05:13 INFO TaskSetManager: Finished task 0.0 in stage 5.0 (TID 5) in 32 ms on 10.1.10.47 (1/1)
        15/02/02 15:05:13 INFO DAGScheduler: Stage 5 (take at <console>:15) finished in 0.034 s
        15/02/02 15:05:13 INFO TaskSchedulerImpl: Removed TaskSet 5.0, whose tasks have all completed, from pool
        15/02/02 15:05:13 INFO DAGScheduler: Job 5 finished: take at <console>:15, took 0.040613 s
        20090505-000000 aa Main_Page 2 9980
        20090505-000000 ab %D0%90%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%BD%D0%B5%D1%82 1 465
        20090505-000000 ab %D0%98%D1%85%D0%B0%D0%B4%D0%BE%D1%83_%D0%B0%D0%B4%D0%B0%D2%9F%D1%8C%D0%B0 1 16086
        20090505-000000 af.b Tuisblad 1 36236
        20090505-000000 af.d Tuisblad 4 189738
        20090505-000000 af.q Tuisblad 2 56143
        20090505-000000 af Afrika 1 46833
        20090505-000000 af Afrikaans 2 53577
        20090505-000000 af Australi%C3%AB 1 132432
        20090505-000000 af Barack_Obama 1 23368
    
    You now have a distributed Spark instance now!

