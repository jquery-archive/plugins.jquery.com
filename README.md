# plugins.jquery.com

The jQuery Plugins site, http://plugins.jquery.com/

### How it works

The plugins site is an index of GitHub repositories that contain jQuery plugins. The repositories can contain one or many jQuery plugin with an accompanying valid `plugin.jquery.json` manifest file in the repository root. The specification for this file lives [here](http://plugins.jquery.com/docs/package-manifest).

### How to list a plugin

Simply add a [post-receive hook](http://help.github.com/post-receive-hooks/) to your repository with our web hook url, `http://plugins.jquery.com/postreceive-hook.`.

## Development

### Requires

* jQuery's [jquery-wp-content](https://github.com/jquery/jquery-wp-content/)
* Web server (such as Apache)
* PHP
* MySQL
* WordPress
* node
* git

### Installation

#### web-base-template

1. Follow the installation steps for [jquery-wp-content](https://github.com/jquery/jquery-wp-content/).

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

### Running the site

`node scripts/manager.js`
