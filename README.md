# plugins.jquery.com

The jQuery Plugins site, http://plugins.jquery.com/

### How it works

The plugins site is an index of GitHub repositories that contain jQuery plugins. In general, the repositories must contain a single jQuery plugin with an accompanying valid `package.json` in the repository root. The specification for this file is in [docs/package.md](/jquery/plugins.jquery.com/blob/master/docs/package.md).

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

#### HOSTS

1. Add a `dev.plugins.jquery.com` entry in /etc/hosts

 * `127.0.0.1 dev.plugins.jquery.com`

#### web-base-template

1. Download or clone web-base-template

 * `git clone git://github.com/jquery/web-base-template.git`

#### WordPress

1. Install and run a web server (such as Apache), PHP, and MySQL.

2. Follow http://codex.wordpress.org/Installing_WordPress#Famous_5-Minute_Install

3. Move `wordpress/wp-config.php` to `wp-config.php` and add the following:

    define( 'WP_CONTENT_DIR', dirname( ABSPATH ) . '/web-base-template' );
    define( 'WP_CONTENT_URL', 'http://dev.plugins.jquery.com/web-base-template' );

4. Copy `wordpress/index.php` to `index.php` and add update the require at the bottom to be:

    require('./wordpress/wp-blog-header.php');

#### WordPress config

From http://dev.plugins.jquery.com/wordpress/wp-admin/

1. Update Site Address

 * Select Settings -> General
 * Set Site Address to http://dev.plugins.jquery.com

2. Activate the plugins-jquery-com theme

 * Select Appearance -> Themes
 * Under plugins-jquery-com, select 'Activate'

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

4. `cp config-sample.json config.json`

5. Edit config.json
    * Set `wordpress` properties to contain a valid username and password for the WordPress site.

6. `grunt setup`
    * This is a one time setup.

7. `node scripts/update-server.js`
    * This starts an HTTP server on port 8001, which expects post-receive hooks as requests.

8. `node scripts/wordpress-update.js`
    * This is a long running process which keeps WordPress in sync with the plugins DB.
