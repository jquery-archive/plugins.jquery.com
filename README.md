# plugins.jquery.com

The jQuery Plugins site, http://plugins.jquery.com/

## How it works

This site is an index of GitHub repositories that each contain a single
jQuery plugin. Each such repository contains a valid `package.json` in
the repository root. The specification for this file is in
[docs/package.md](/jquery/plugins.jquery.com/blob/master/docs/package.md).

## How to list a plugin

Add a line with the GitHub repo url to
[plugins.txt](/jquery/plugins.jquery.com/blob/master/plugins.txt), like
so

`pluginname http://github.com/username/reponame`

## Requires

* PHP
* MySql
* WordPress
* node
* npm
* git

## Installing

1. Install WordPress. See http://codex.wordpress.org/Installing_WordPress

2. `git clone git@github.com:jquery/plugins.jquery.com.git`

3. `cd plugins.jquery.com`

4. `cp src/config-sample.json src/config.json`

5. Edit src/config.json

6. `node src/main.js`
