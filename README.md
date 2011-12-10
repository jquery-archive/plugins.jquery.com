# plugins.jquery.com

The jQuery Plugins site, http://plugins.jquery.com/

### How it works

This site is an index of GitHub repositories that each contain a single jQuery plugin. Each such repository contains a valid `package.json` in the repository root. The specification for this file is in [docs/package.md](/jquery/plugins.jquery.com/blob/master/docs/package.md).

### How to list a plugin

Simply add a [post-receive hook](http://help.github.com/post-receive-hooks/) to your repository with our web hook url, `http://plugins.jquery.com/_update`.
**Warning:** This is not yet functional!

## Development

### Requires

* jQuery's [web-base-template](https://github.com/jquery/web-base-template)
* Web server (such as Apache)
* PHP
* MySQL
* WordPress
* node
* git

### Installation

### web-base-template

1. Download or clone web-base-template

    * `git clone git://github.com/jquery/web-base-template.git`

#### HOSTS

1. Add a `plugins.jquery.com.dev` entry in /etc/hosts

    * `127.0.0.1 plugins.jquery.com.dev`

#### WordPress

1. Install and run a web server (such as Apache), PHP, and MySQL.

2. Follow http://codex.wordpress.org/Installing_WordPress#Famous_5-Minute_Install

3. Redirect your WordPress install to use the web-base-template's theme and config (replacing "[YourWordPressInstallDirectory]" with the actual name of the directory where you installed WordPress)
    * `rm -rf [YourWordPressInstallDirectory]/wp-content`
    * `ln -s web-base-template/wordpress/wp-content wordpress/wp-content`

#### WordPress config

From http://plugins.jquery.com.dev/wp-admin/

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

#### Install node >=0.6.4

1. Follow https://github.com/joyent/node/wiki/Installation

#### plugins.jquery.com setup

1. `git clone git@github.com:jquery/plugins.jquery.com.git`

2. `cd plugins.jquery.com`

3. `npm install`

4. `cp src/config-sample.json src/config.json`

5. Edit src/config.json
    * Set `dbName` to your WordPress MySQL database name
    * Set `dbUser` to your WordPress MySQL database user
    * Set `dbPassword` to your WordPress MySQL database password
    * Leave `siteId` null (unless you happen to be using a Wordpress multi-site installation locally, in which case supply the site's ID in the multi-site install)

6. `node src/setup.js`

7. `node src/main.js`
