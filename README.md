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

* jQuery's [web-base-template](https://github.com/jquery/web-base-template)
* Web server (such as Apache)
* PHP
* MySql
* WordPress
* node
* git

## Installing

### web-base-template

1. Download or clone web-base-template

`git clone git://github.com/jquery/web-base-template.git`

### HOSTS

1. Add a `plugins.jquery.com.local` entry in /etc/hosts

### WordPress

1. Install a web server (such as Apache), PHP, and MySql

2. Follow http://codex.wordpress.org/Installing_WordPress#Famous_5-Minute_Install

3. Replace the default WordPress wp-content with the one in web-base-template

`rm -rf wordpress/wp-content`

`ln -s web-base-template/wordpress/wp-content wordpress/wp-content`

### WordPress config

From http://plugins.jquery.com.local/wp-admin/

1. Activate the plugins-jquery-com theme

 * Select Appearance -> Themes
 * Under plugins-jquery-com, select 'Activate'

2. Activate the jQuery Slugs plugin

 * Select Plugins
 * Under jQuery Slugs, select 'Activate'

3. Set Custom Structure for Permalinks

 * Select Settings -> Permalinks
 * Select Custom Structure
 * Enter `/%postname%/`
 * Click Save Changes
 * Edit wordpress/.htaccess

```
    # BEGIN WordPress
    <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.php$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.php [L]
    </IfModule>
    # END WordPress
```

### Install node

1. Follow https://github.com/joyent/node/wiki/Installation

### plugins.jquery.com setup

1. `git clone git@github.com:jquery/plugins.jquery.com.git`

2. `cd plugins.jquery.com`

3. `npm install`

4. `cp src/config-sample.json src/config.json`

5. Edit src/config.json

6. `node src/main.js`
