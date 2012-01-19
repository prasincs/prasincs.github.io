#!/bin/bash
read -p "Blog Post Title: " -e title
if [ ! -n "$title" ]
then
  echo "Umm, I need a title!";
  exit 1;
fi

#Convert uppercase letters to lowercase
lcase_title=`echo $title |  tr '[A-Z]' '[a-z]'`

if [ ! -n "$EDITOR" ]
then
  EDITOR="vim"
fi

file_name=`echo $lcase_title | tr ' ' '_'`

TEMPLATE="
---
layout: post
title: $title
categories:
- 
---
"
file_path=_posts/$(date +%Y-%m-%d-$file_name.markdown)

echo "$TEMPLATE" > $file_path

$EDITOR $file_path
