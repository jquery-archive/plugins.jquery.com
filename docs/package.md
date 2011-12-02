Specification of the jQuery Plugins Site package.json
=====================================================

# DRAFT (heavily inspired by that of npm. Thanks isaacs)

This document is all you need to know about what's required in your package.json
file. It must be actual JSON, not just a JavaScript object literal.

## Required Fields

* name
* version
* title
* author
* licenses
* dependencies

## Optional Fields

* description
* keywords
* homepage
* files

## name

The *most* important things in your package.json are the name and version fields.
Those are actually required, and your plugin won't register without
them. The name and version together form an identifier that is assumed
to be completely unique. Changes to the plugin should come along with
changes to the version.

The name is what your thing is called. Some tips:

* Don't put "js" or "jquery" in the name. It's assumed that it's js, since you're
  writing a package.json file, and it's assumed that it's a jQuery plugin, because
  you're registering it on the jQuery Plugins Site. Additionally, you will be listing
  `jquery` as a dependency, along with compatible versions (see 'Dependencies' below).
* The name ends up being part of a URL. Any name with non-url-safe characters will
  be rejected. Also, it can't start with a dot or an underscore. The jQuery Plugins
  Site is UTF-8.
* The name should be short, but also reasonably descriptive.
* You may want to check the jQuery Plugins Site to see if there's something by that
  name already, before you get too attached to it. http://plugins.jquery.com/
* If you have a plugin with the same name as a plugin already in the jQuery Plugins
  Site, either consider renaming your plugin or namespace it. For example, jQuery UI
  plugins are listed with the "ui-" prefix (e.g. ui-dialog, ui-autocomplete).

## version

The *most* important things in your package.json are the name and version fields.
Those are actually required, and your plugin won't register without
them. The name and version together form an identifier that is assumed
to be completely unique. Changes to the plugin should come along with
changes to the version.

Version must be parseable by
[node-semver](https://github.com/isaacs/node-semver).

Here's how the node-semver implementation (which the jQuery Plugins Site uses)
deviates from what's on semver.org:

* Versions can start with "v"
* A numeric item separated from the main three-number version by a hyphen
  will be interpreted as a "build" number, and will *increase* the version.
  But, if the tag is not a number separated by a hyphen, then it's treated
  as a pre-release tag, and is *less than* the version without a tag.
  So, `0.1.2-7 > 0.1.2-7-beta > 0.1.2-6 > 0.1.2 > 0.1.2beta`

This is a little bit confusing to explain, but matches what you see in practice
when people create tags in git like "v1.2.3" and then do "git describe" to generate
a patch version.

## title

A nice complete and pretty title of your plugin. Include jQuery (if you want) and
spaces and mixed case, unlike name (see above).

## author

See below: people fields

## licenses

Array of licenses under which the plugin is provided. Each license is a hash with
a "type" property specifying the type of license and a url property linking to the actual text. If the license is one of the official open source licenses the official license name or its abbreviation may be explicated with the "type" property. If an abbreviation is provided (in parentheses), the abbreviation must be used.

    "licenses": [
       {
           "type": "GPLv2",
           "url": "http://www.example.com/licenses/gpl.html",
       }
    ]

## dependencies

Dependencies are specified with a simple hash of package name to version
range. The version range is EITHER a string which has one or more
space-separated descriptors, OR a range like "fromVersion - toVersion".

If a plugin that you depend on uses other plugins as dependencies that your plugin
uses as well, we recommend you list those also. In the event that the depended on
plugin alters its dependencies, your plugin's dependency tree won't be affected.

Libraries such as jQuery or underscore, though not plugins, should be listed as
dependencies as well. This gives you the flexibility to specify compatible versions
of each library you depend on.

## description

Put a description in it. It's a string. This helps people discover your
plugin, as it's listed on the jQuery Plugins Site.

## keywords

Put keywords in it. It's an array of strings. This helps people
discover your plugin as it's listed on the jQuery Plugins Site.

## homepage

The url to the plugin homepage.

## people fields: author, contributors

The "author" is one person. "contributors" is an array of people. A "person"
is an object with a "name" field and optionally "url" and "email", like this:

    { "name" : "Barney Rubble"
    , "email" : "b@rubble.com"
    , "url" : "http://barnyrubble.tumblr.com/"
    }

Both the email and url are optional.

## files

The "files" field is an array of files that make up your plugin. This should
be a file path relative to the root of your plugin folder.

If you name a folder in the array, then it will also include the files
inside that folder.

### Specifying Versions

Version range descriptors may be any of the following styles, where "version"
is a semver compatible version identifier.

* `version` Must match `version` exactly
* `=version` Same as just `version`
* `>version` Must be greater than `version`
* `>=version` etc
* `<version`
* `<=version`
* `~version` See 'Tilde Version Ranges' below
* `1.2.x` See 'X Version Ranges' below
* `http://...` See 'URLs as Dependencies' below
* `*` Matches any version
* `""` (just an empty string) Same as `*`
* `version1 - version2` Same as `>=version1 <=version2`.
* `range1 || range2` Passes if either range1 or range2 are satisfied.

For example, these are all valid:

    { "dependencies" :
      {
        "foo" : "1.0.0 - 2.9999.9999",
        "bar" : ">=1.0.2 <2.1.2",
        "baz" : ">1.0.2 <=2.3.4",
        "boo" : "2.0.1",
        "qux" : "<1.0.0 || >=2.3.1 <2.4.5 || >=2.5.2 <3.0.0",
        "asd" : "http://asdf.com/asdf.tar.gz",
        "til" : "~1.2",
        "elf" : "~1.2.3",
        "two" : "2.x",
        "thr" : "3.3.x"
      }
    }

### Tilde Version Ranges

A range specifier starting with a tilde `~` character is matched against
a version in the following fashion.

* The version must be at least as high as the range.
* The version must be less than the next major revision above the range.

For example, the following are equivalent:

* `"~1.2.3" = ">=1.2.3 <1.3.0"`
* `"~1.2" = ">=1.2.0 <2.0.0"`
* `"~1" = ">=1.0.0 <2.0.0"`

### X Version Ranges

An "x" in a version range specifies that the version number must start
with the supplied digits, but any digit may be used in place of the x.

The following are equivalent:

* `"1.2.x" = ">=1.2.0 <1.3.0"`
* `"1.x.x" = ">=1.0.0 <2.0.0"`
* `"1.2" = "1.2.x"`
* `"1.x" = "1.x.x"`
* `"1" = "1.x.x"`

You may not supply a comparator with a version containing an x. Any
digits after the first "x" are ignored.
