<script>{
	"title": "Naming Your Plugin"
}</script>

Before you can list your plugin on this site, you'll need to choose a name for your plugin. The name is a unique identifier that distinguishes your plugin from all other plugins. This is different from the title of your plugin, which you can think of as the display name.

**Plugin names may only contain letters, numbers, hypens, dots, and underscores.**

We encourage you to follow a few simple tips as well:


* Choose a name that is short, but also reasonably descriptive.
* Match your plugin name to your file name, e.g., the foo plugin would live in a file named jquery.foo.js.
* Check the site to see if the name you want is available, before getting your heart set on a name that's already taken.

## First Come, First Serve

Names are registered on a first come, first serve basis. Registering a name happens automatically the first time you [publish a release](/docs/publish/) of your plugin. You cannot reserve a name prior to releasing your plugin. Once you've registered a name, you are the sole owner of that name. Nobody else will be able to publish a release using the same name. There is no limit on how many plugins/names a single person may register, but all plugins must be legitimate.

Package squatting is not allowed. If you sit on a package name and don't publish code, it may be deleted without warning.

In these early days of the registry's existence, we do ask that authors reserve judgment and respect for other popular, widely-adopted plugins that may already have a reasonable historical claim to a particular name, even if it has not yet been registered.

## Transferring Ownership

While most plugins will only ever have one owner, there are times when the original owner may move on to other projects and wish to transfer ownership to someone else. There is currently no automated process for this, the original owner must contact [plugins@jquery.com](mailto:plugins@jquery.com), prove ownership and indicate who the new owner should be.

In the case of an abandoned plugin where the original owner is no longer active, the jQuery team can choose to change ownership at their discretion. These will indeed be a rare occurrence, likely requiring an event such as _why or Mark Pilgrim's infosuicide.

## Prefixes & Plugin Suites

Certain prefixes will also be blacklisted for individual plugins. Large projects which include many plugins in a single repository, such as [jQuery UI](http://jqueryui.com), are registered as suites. Each suite is required to have a unique prefix and all of their plugin names must use that prefix. As such, no other plugin may use a name with a suite's prefix. Suites must be manually vetted by the jQuery team.

**Note:** In order to allow proper naming of extensions for plugins in a suite, the prefix blacklisting is only one level deep. For example, jQuery UI owns all `ui.*` names, but `ui.autocomplete.*` is open to the public.
