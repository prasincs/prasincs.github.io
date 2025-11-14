---
date: 2015-04-27T00:00:00Z
description: ""
tags: []
title: Importing Open Data Files to JOSM
url: /2015/04/27/importing-open-data-files-to-josm/
---



Following on my previous post on [Getting Starting with Open StreetMap for Nepal](http://nextdoorhacker.com/2015/04/26/getting-started-with-open-streetmap-for-nepal), I wanted to look at the open datasets and GIS shapefiles that people have been sharing. Given the lack of additional data and poor satellite image resolution, being able to delineate Village Development Committee (VDC) would be great help, in my opinion. Here's how to setup the [JOSM](http://josm.openstreetmap.de) tool to do so. We'll get the data from [HDX Data repository](https://data.hdx.rwlabs.org/nepal-earthquake) in the form of zip files to open in JOSM.

My base system is Mac OSX -- Linux and Windows are somewhat similar (all you need to know is _Preferences_ are under the Program Name menu in OSX and under Edit in Linux and Windows).

# Download JOSM

Get the relevant version from http://josm.openstreetmap.de/, I think the jar file is good enough on all OSes.

# Run the program

If you're okay with commandline, run `java -jar josm-tested.jar` or just click on the jar file or application.

## Setup Remote Control

The way JOSM works with rest of OpenStreetMap is that it opens ports on 8111 and 8112 for external applications controlling JOSM.

Go to _JOSM > Preferences_ and click the remote like button on the left side. It took me a while to see the tabs on the left.

![JOSM Remote Control](/assets/images/nepal/osm-josm-remotecontrol.png)

Enable Remote Control in the screen. You'll be asked to restart the application for the changes to take effect.

## Open the browser where the task is open and Select "Edit with JOSM"

![Edit with JOSM from Browser](/assets/images/nepal/osm-josm-browser.png)

The JOSM window should open the right location with the proper layers.

If the screen is all black with some lines, it means you have to pick one of the imagery services from the Imagery menu. I pick "Bing Aerial Images"

![JOSM initial image](/assets/images/nepal/osm-josm-screen.png)

# Importing OpenData from HDX data repository

Download the dataset from [https://data.hdx.rwlabs.org/dataset/nepal-admin-level-4-administrative-boundaries-cod](https://data.hdx.rwlabs.org/dataset/nepal-admin-level-4-administrative-boundaries-cod). It will be a zip file named `npl_polbnda_adm4_vdc_25k_50k_sdn_wgs84.shp.zip`.

## Download Opendata plugin

### Open Preferences

Open Preferences and Click on "Configure available plugins..." icon on the left. It's 4th item from the top as of 2015-26 release.

![JOSM Plugins](/assets/images/nepal/osm-josm-plugins.png)

Search for OpenData and select it.

![JOSM OpenData Plugin](/assets/images/nepal/osm-josm-plugins-opendata.png)

Once you've selected it, press ok.

# Open the Zip File

Go to _File > Open_ and navigate to the zip file `npl_polbnda_adm4_vdc_25k_50k_sdn_wgs84.shp.zip` that you downloaded earlier. This will show up as a new layer on top of the existing map. You can enable and disable the layers from the right hand side.

![JOSM - New HDX Layer](/assets/images/nepal/osm-josm-hdx-layer.png)

# Continue Mapping

I'm currently using this only as a guide to avoid pushing something upstream that breaks things. You can download more datasets and shape files to guide your mapping work.
