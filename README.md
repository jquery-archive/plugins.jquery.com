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

2. `git clone git://github.com/jquery/web-base-template.git`

3. `rm -rf wordpress/wp-content`

4. `ln -s web-base-template/wordpress/wp-content wordpress/wp-content`

5. `git clone git@github.com:jquery/plugins.jquery.com.git`

6. `cd plugins.jquery.com`

7. `cp src/config-sample.json src/config.json`

8. Edit src/config.json

9. `node src/main.js`
