<script>{
	"title": "Publishing Your Plugin"
}</script>

Publishing your plugin on the site is a three step process:

<div class="warning">
	The jQuery Plugin Registry is in read-only mode. New plugin releases will not be processed. We recommend moving to <a href="https://www.npmjs.com/">npm</a>, using "<a href="https://www.npmjs.org/browse/keyword/jquery-plugin">jquery-plugin</a>" as the keyword in your package.json. The npm blog has <a href="http://blog.npmjs.org/post/111475741445/publishing-your-jquery-plugin-to-npm-the-quick">instructions for publishing your plugin to npm</a>.
</div>

## Add a Service Hook

First, you'll need to enable the jQuery Plugins service hook on GitHub. On the
settings page for your repository, click the Webhooks &amp; Services link, then
click the Configure services button. Scroll down to find the jQuery Plugins
service and enable it (there's no config, just check the Active checkbox and
click the Update settings button).

## Add a Manifest to your Repository

The jQuery Plugins Registry will look in the root level of your repository for
any files named `*.jquery.json`. You will want to create
`*yourplugin*.jquery.json` according to the [package manifest
specification](/docs/package-manifest/). Use an online JSON verifier such as
[JSONlint](http://jsonlint.com) to make sure the file is valid. You are now
ready to publish your plugin!

## Validate Your Manifest File Here

<div>
	Upload your manifest file to check for common errors:
	<input type="file" name="files" value="Upload Manifest">
	<p>Since this tool uses the new HTML5 FileReader API to look at the file contents
		without actually uploading your file to the server, you'll need a modern browser
		like Chrome, Safari, Firefox, Opera or IE10. </p>
	<pre id="validator-output"></pre>
</div>

<script src="/resources/validate.js"></script>

## Publishing a Version

After the service hook is setup and your manifest has been added,
publishing your plugin is as simple as tagging the version in git and pushing
the tag to GitHub. The service hook will notify the plugins site that a
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

The registry **does not support re-processing tags that it has already seen.**
Therefore, we strongly suggest that you **do not overwrite old tags**. Instead,
update the version number tag in the manifest, commit, and create a new tag to
fix any errors you've encountered. 

For example, you've pushed version `v1.7.0` of your plugin, but there is an
[error detected](/error.log) in the manifest. If you fix the error, delete,
re-create, and push another `v1.7.0` tag, the registry **will not** detect it.
You will have to create and push `v1.7.1`.


## Troubleshooting

If you have problems with your plugin not publishing you should check the
[error log](/error.log) for hints on what the problem might be.

If you still encounter trouble getting this process to work with your plugin, please
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
