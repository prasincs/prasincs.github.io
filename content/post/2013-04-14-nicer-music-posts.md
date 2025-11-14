---
categories:
- music
date: 2013-04-14T00:00:00Z
description: ""
tags: []
title: Nicer Music Posts
url: /2013/04/14/nicer-music-posts/
---



So, I found this awesome library called [VexTab](http://vexflow.com/vextab/) that allows you to write down musical notations in a simple syntax and generates a HTML5/javascript rendering of the notation.  I have some little snippets to allow rendering chords and tabs with/without notations. This will be specific to Jekyll generated sites on Github, you can be much cleverer on your server.

It's almost too easy but here you go. How to include music notation in your blog -- you can ignore raphael.js and chart/chord.js files if you don't want chord representations. Put these files in your html from vexflow/vextab projects.
{{< highlight html >}}
<script src="/js/raphael.js"></script>
<script src="/js/jquery.min.js"></script>
<script src="/js/underscore-min.js"></script>
<script src="/js/vexflow-min.js"></script>
<script src="/js/tabdiv-min.js"></script>
<script src="/js/chord.js"></script>
<script src="/js/chart.js"></script>
<script src="/js/music-post.js"></script>
{{< /highlight >}}


You can to get the `tabdiv-min.js` file from vextab project after compiling. Or, you can browse to the `/assets/themes/js` directory and copy all the files. Please respect the work of original author. Look at `music-post.js` file to see how this is done.

After that, you can render anything in the `VexTab` format including the chords.

So your code
{{< highlight html >}}
<div class="music music-vextab">
tabstave notation=true tablature=false
notes Cn-D-E/4 F#/5
</div>

{{< /highlight >}}

will look like

<div class="music music-vextab">
tabstave notation=true tablature=false
notes Cn-D-E/4 F#/5
</div>

For more details on what the texts mean, please check the [VexTab tutorial](http://vexflow.com/vextab/tutorial.html).

And, I adapted this from the [Vexchord Demo](http://vexflow.com/vexchords/)
{{< highlight html >}}
<div class="music music-chord" data-key="E" data-str="E" data-shape="M E">
</div>
{{< /highlight >}}

will look like
<div class="music music-chord" data-key="E" data-str="E" data-shape="M E">
</div>


Next step is to start blogging about music/theory along with nicer notations!
