---
categories:
- php
- hack
date: 2012-01-18T00:00:00Z
title: PHP isset with variable name
url: /2012/01/18/php_isset_with_variable_name/
---

I wont try to justify PHP hacking but I was working on a project that's based on [CodeIgniter](http://codeigniter.com). It's on a cycle of heavy refactoring. I was wondering if I could do something like 

{{< highlight php >}}
isset("variable_name");
{{< / highlight >}}

similar to  python
{{< highlight python >}}
"variable_name" in globals() 
{{< / highlight >}}

Same idea with locals() in python.

Thankfully, php has the equivalent of `globals()` being `$GLOBALS` which would return you all the variables declared so far. Now you can just write your own `isset_varname()`. `get_defined_vars()` is equivalent in php to `locals()`. in  python.


{{< highlight php >}}
<?php
function isset_varname($varname){
  return array_key_exists($varname, $GLOBALS);
}
$test= "test";
var_dump(isset_varname("test")); // should print bool(true)
var_dump(isset_varname("test2")); // should print bool(false)
?>
{{< / highlight >}}

you'd probably need to check for the variable name regex and store output from get_defined_vars() in another place too. Of course, if there's some other similar function that anyone else knows about, I'd be happy to find out.

