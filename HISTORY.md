Express YUI Change History
==========================

0.4.0 (2013-06-07)
------------------

* registration and setting for groups are now decoupled (order does not matter anymore).
* introducing `app.set('yui default base', 'http://path/to/cdn/{{groupDir}}/');`
* introducing `app.set('yui default root', 'something/{{groupDir}}/')'`
* introducing `app.set('yui combo config', { comboBase: '/combo?', comboSep: '?', maxURLLength: 1024})`
* removing `app.yui.setGroupFromCDN()`, use `applyGroupConfig` instead.
* removing `app.yui.setGroupFromAppOrigin()`, that's the new default behavior and you can use `applyGroupConfig` if you need more granularity.
* removing `app.yui.combineGroups()`, it will inherit from the top level `combine` value.
* from now on, the folder that represents the build directory for the bundle will be used as the `root` for loader, so the version of the bundle will be included.
* `combine` is now inherited by default from top level or defaults to `true`
* `filter` is now inherited by default from top level or defaults to `min`

0.3.3 (2013-05-30)
------------------

* Cleaning up the cache entry when shifter fails to process a file to avoid successive runs to hide failures due to cached entries.

0.3.2 (2013-05-29)
------------------

* bugfix for filter that was producing relative path for shifter instead of fullpath.

0.3.1 (2013-05-24)
------------------

* Adding support for `filter` configuration when creating a loader plugin to exclude
files from the shifting process.

0.3.0 (2013-05-23)
------------------

* Renamed to `express-yui`
* Open sourced
* Published in npm

0.0.1 (2013-03-01)
------------------

* Initial release.