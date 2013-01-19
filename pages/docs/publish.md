<script>{
        "title": "Publishing Your Plugin"
}</script>

Publishing your plugin on the site is a three step process:

## Add a Post-Receive Hook

First, you'll need to create a post-receive hook on GitHub. Just follow the
[step-by-step guide for adding a
webhook](https://help.github.com/articles/post-receive-hooks) and set the URL
to `http://plugins.jquery.com/postreceive-hook`.

## Add a Manifest to your Repository

The jQuery Plugins Registry will look in the root level of your repository for
any files named `*.jquery.json`.  You will want to create
<code><em>yourplugin</em>.jquery.json</code> according to the [package manifest
specification](/docs/package-manifest/). Use an online JSON verifier such as
[JSONlint](http://jsonlint.com) to make sure the file is valid. You are now
ready to publish your plugin!

## Publishing a Version

After the post-receive hook is setup and your manifest has been added,
publishing your plugin is as simple as tagging the version in git and pushing
the tag to GitHub.  The post-receive hook will notify the plugins site that a
new tag is available and the plugins site will take care of the rest!

```bash
$ git tag 0.1.0
$ git push origin --tags
```

The name of the tag **must** be a valid [semver](http://semver.org/) value, but
may contain an optional `v` prefix. The tag name must also match the
version listed in the manifest file. So, if the version field in the manifest
is "0.1.1" the tag should be either "0.1.1" or "v0.1.1". If the manifest file
is valid, the version will be automatically added to the plugins site.

We highly suggest that you **do not overwrite old tags**, instead, push a new
version number tag (and commit to the manifest) to fix any errors you've
encountered.

## Having Trouble? 

Unfortunately we do not currently have a system for
notifying you if there is a problem. If you're interested in helping improve
this aspect of the plugins site, we'd [love your
help](https://github.com/jquery/plugins.jquery.com/issues/11).

If you encounter trouble getting this process to work with your plugin, please
join the IRC channel [#jquery-content](irc://freenode.net:6667/#jquery-content)
on [freenode](http://freenode.net).  If you can't seem to connect with someone
in the IRC channel, please feel free to email us at
[plugins@jquery.com](mailto:plugins@jquery.com).

## How long should the process take

When everything works, this process is pretty close to instant.  There are
caches in place, etc, but in general, if you haven't seen your plugin get
updated on the site within 5 minutes, there is a good chance something went
wrong.  Going into your Web Hooks settings and hitting the "Test Hook" button
(once) may help if you recently pushed a new tag.
