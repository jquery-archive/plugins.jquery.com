Specification of the jQuery Plugins Site Manifest File
======================================================

# LIVING SPEC (heavily inspired by that of npm, thanks isaacs)

This document is all you need to know about what's required in your jquery.json
manifest file(s).

Manifest files must live in the root of your repository and exist in your tags.
The files must be actual JSON, not just a JavaScript object literal.

**NOTE: Manifest file names must contain the plugin name, e.g. foo.jquery.json.**

# Fields

## Required Fields

* <a href="#field-name">name</a>
* <a href="#field-version">version</a>
* <a href="#field-title">title</a>
* <a href="#field-author">author</a>
* <a href="#field-licenses">licenses</a>
* <a href="#field-dependencies">dependencies</a>

## Optional Fields

* <a href="#field-description">description</a>
* <a href="#field-keywords">keywords</a>
* <a href="#field-homepage">homepage</a>
* <a href="#field-docs">docs</a>
* <a href="#field-demo">demo</a>
* <a href="#field-download">download</a>
* <a href="#field-bugs">bugs</a>
* <a href="#field-maintainers">maintainers</a>

## <a name="field-name">name</a>

The *most* important things in your manifest file are the name and version fields.
The name and version together form an identifier that is assumed
to be completely unique. Changes to the plugin should come along with
changes to the version.

The name is what your thing is called. Some tips:

* Don't put "js" or "jquery" in the name. It's assumed that it's js and jquery, since
  you're writing a jquery.json manifest file.
* The name ends up being part of a URL. Any name with non-url-safe characters will
  be rejected. The jQuery Plugins Site is UTF-8.
* The name should be short, but also reasonably descriptive.
* You may want to check [the plugins site](http://plugins.jquery.com/)
  to see if there's something by that name already, before you get too attached to it.
* If you have a plugin with the same name as a plugin already in the jQuery Plugins
  Site, either consider renaming your plugin or namespacing it. For example, jQuery UI
  plugins are listed with the "ui." prefix (e.g. ui.dialog, ui.autocomplete).

## <a name="field-version">version</a>

The *most* important things in your manifest file are the name and version fields.
The name and version together form an identifier that is assumed
to be completely unique. Changes to the plugin should come along with
changes to the version. Version number must be a valid semantic version number
per [node-semver](https://github.com/isaacs/node-semver).

See [Specifying Versions](#specifying-versions).

## <a name="field-title">title</a>

A nice complete and pretty title of your plugin. This will be used for the page
title and top-level heading on your plugin's page. Include jQuery (if you want) and
spaces and mixed case, unlike [name](#field-name).

## <a name="field-author">author</a>

One person.

See [People Fields](#people-fields).

## <a name="field-licenses">licenses</a>

Array of licenses under which the plugin is provided. Each license is a hash with
a url property linking to the actual text and an optional "type" property specifying the type of license. If the license is one of the [official open source licenses](http://www.opensource.org/licenses/alphabetical), the official license name or its abbreviation may be explicated with the "type" property.

    "licenses": [
       {
           "type": "GPLv2",
           "url": "http://www.example.com/licenses/gpl.html"
       }
    ]

## <a name="field-dependencies">dependencies</a>

Dependencies are specified with a simple hash of package name to version
range. The version range is EITHER a string which has one or more
space-separated descriptors, OR a range like "fromVersion - toVersion".

If a plugin that you depend on uses other plugins as dependencies that your plugin
uses as well, we recommend you list those also. In the event that the depended on
plugin alters its dependencies, your plugin's dependency tree won't be affected.

Libraries such as jQuery or underscore, though not plugins, should be listed as
dependencies as well. This gives you the flexibility to specify compatible versions
of each library you depend on.

You must list at least one dependency, `jquery` (note that it's lower-case).

## <a name="field-description">description</a>

Put a description in it. It's a string. This helps people discover your
plugin, as it's listed on the jQuery Plugins Site.

## <a name="field-keywords">keywords</a>

Put keywords in it. It's an array of strings. This helps people
discover your plugin as it's listed on the jQuery Plugins Site.
Keywords may only contain letters, numbers, hyphens, and dots.

## <a name="field-homepage">homepage</a>

The url to the plugin homepage.

## <a name="field-docs">docs</a>

The url to the plugin documentation.

## <a name="field-demo">demo</a>

The url to the plugin demo or demos.

## <a name="field-download">download</a>

The url to download the plugin. A download URL will be automatically generated
based on the tag in GitHub, but you can specify a custom URL if you'd prefer
to send users to your own site.

## <a name="field-bugs">bugs</a>

The url to the bug tracker for the plugin.

## <a name="field-maintainers">maintainers</a>

An array of people.

See [People Fields](#people-fields).

# <a name="people-fields">People Fields</a>

A "person" is an object with a "name" field and optionally "url" and
"email", like this:

    {
      "name" : "Barney Rubble",
      "email" : "b@rubble.com",
      "url" : "http://barnyrubble.tumblr.com/"
    }

Both the email and url are optional.

# <a name="specifying-versions">Specifying Versions</a>

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

## <a name="tilde-version-ranges">Tilde Version Ranges</a>

A range specifier starting with a tilde `~` character is matched against
a version in the following fashion.

* The version must be at least as high as the range.
* The version must be less than the next major revision above the range.

For example, the following are equivalent:

* `"~1.2.3" = ">=1.2.3 <1.3.0"`
* `"~1.2" = ">=1.2.0 <2.0.0"`
* `"~1" = ">=1.0.0 <2.0.0"`

## <a href="x-version-ranges">X Version Ranges</a>

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

## <a href="sample">Sample manifest</a>

**color.jquery.json**

```json
{
    "name": "color",
    "version": "2.0.0-beta.1",
    "title": "jQuery.Color()",
    "author": {
        "name": "John Resig",
        "url": "https://github.com/jeresig"
    },
    "licenses": [
        {
            "type": "MIT",
            "url": "https://github.com/jquery/jquery-color/raw/2.0.0-beta.1/MIT-LICENSE.txt"
        },
        {
            "type": "GPLv2",
            "url": "https://github.com/jquery/jquery-color/raw/2.0.0-beta.1/GPL-LICENSE.txt"
        }
    ],
    "dependencies": {
        "jquery": ">=1.6"
    },
    "description": "The main purpose of this plugin is to animate color properties on elements using jQuery's .animate()",
    "keywords": [
        "color",
        "animate",
        "rgba",
        "hsla"
    ],
    "homepage": "https://github.com/jquery/jquery-color",
    "maintainers": [
        {
            "name": "Corey Frang",
            "url": "https://github.com/gnarf37"
        }
    ]
}
```