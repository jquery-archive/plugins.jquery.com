# plugins.jquery.com

The jQuery Plugins site, http://plugins.jquery.com/

### How it works

The plugins site is an index of GitHub repositories that contain jQuery plugins. The repositories can contain one or many jQuery plugin with an accompanying valid `plugin.jquery.json` manifest file in the repository root. The specification for this file lives [here](http://plugins.jquery.com/docs/package-manifest).

### How to list a plugin

Simply add a [post-receive hook](http://help.github.com/post-receive-hooks/) to your repository with our web hook url, `http://plugins.jquery.com/postreceive-hook.`. When you push
to your repository, the plugins site will look at your repository's tags and their corresponding manifest file (thepluginname.jquery.json). You can read up on this process,
as well as the requirements of the manifest file on [the jQuery Plugins Site](http://plugins.jquery.com/docs/publish/).

Assuming there were no errors in your manifest file, your plugin should be on the plugins site within one to two minutes after pushing to github. If you 
still don't see your plugin listed, you can click the "Test Hook" button on the same page you added the service hook to your repository and the 
plugins site will re-query github for changes, in case github didn't update your repository in time. 

We are currently exploring options to provide feedback on errors encountered during the process of adding your 
plugin to the plugins site. If you are still encountering issues after verifying the post-receive hook is in 
place and that your manifest file is valid, ask for assistance in #jquery-content on [freenode.net](http://freenode.net).

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

You can also install [nave](https://github.com/isaacs/nave), a node version manager. You can easily install it
using [nave-installer](https://github.com/danheberden/nave-installer) or download it manually. 

#### plugins.jquery.com setup

1. `git clone git@github.com:jquery/plugins.jquery.com.git`

2. `cd plugins.jquery.com`

3. `npm install`

4. `cp config-sample.json config.json`

5. Edit config.json
    * Set `wordpress` properties to contain a valid username and password for the WordPress site.

If you want to setup and ultimately run the node scripts that manage plugin entries, run `grunt setup`. 
If you need to clear the db or are getting and error running `grunt setup` regarding the setupdb or 
retrydb tasks failing, run `grunt clean-all`. 

If you have made changes to the documentation and simply want to deploy or update that content, run
`grunt update`. 

#### Running the site for development and debugging

1. `node scripts/update-server.js --console` will start the update server and log its output 
to the terminal window. This will *not* update wordpress, but will let you see the result of 
adding a plugin locally. 

2. `node scripts/wordpress-update.js --console` will process the changes in sqlite into 
entries in wordpress. Note, if you're re-adding plugins that have already been added, you 
will need to remove those entries from wordpress.

### Running the site normally

`node scripts/manager.js` runs the update-server and wordpress-update scripts automatically. 
However, because it handless restarts/failures of these scripts, it is harder to stop this
process (you have to kill the pid's from the processes' pid file). Also, running the servers
manually and individually is much easier for development, as you will probably only *need* 
update-server.js running. 



