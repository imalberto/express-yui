/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node: true, nomen: true */

/**
The `yui.loader` extension exposes a locator plugin to build and register yui meta modules
from shifter module metadata.

@module yui
@submodule loader
**/

"use strict";

var path = require('path'),
    utils = require('./utils');

/**
The `yui.loader` extension exposes a locator plugin to build and register yui modules
and metadata.

Here is an example:

    var plugin = yui.locatorLoader({});

You can also specify whether or not the bundles should be registered as a group on loader
and modules in a bundle should be attached into a Y instance created for the server side.

    var plugin = yui.locatorLoader({
        registerGroup: true,
        registerServerModules: true,
        useServerModules: true
    });

@class loader
@static
@uses *path, utils, shifter
@extensionfor yui
*/
module.exports = {

    /**
    Registers information about modules that will be used
    to generate the bundle meta.

    @method register
    @protected
    @param {string} bundleName The bundle name to be registered.
    @param {string} cacheKey The cache key for the file that generates mod.
    @param {Object} mod The module information generated by the shifter module.
    **/
    register: function (bundleName, cacheKey, mod) {
        this._bundles = this._bundles || {};
        this._bundles[bundleName] = this._bundles[bundleName] || {};
        this._bundles[bundleName][cacheKey] = mod;
    },

    /**
    Creates a locator plugin that can analyze locator bundles, build modules
    and build loader metadata for all yui modules within the bundle.

    @method plugin
    @public
    @param {Object} options Optional plugin configuration
    objects that, if passed, will be mix with the default
    configuration of the plugin.

        @param {Boolean} options.registerGroup Whether or not the bundle should be registered as
        a loader group to be used from the client and server. Default to false.
        @param {Boolean|Function} options.registerServerModules Whether or not server modules should
        be provisioned to be loaded thru `app.yui.use()` on the server side. Default to false.
        @param {Boolean|Function} options.useServerModules Whether or not server modules should
        be automatically used thru `Y.use()` whenever `app.yui.use()` is called.
        @param {Boolean} options.cache Whether or not the shifting process should be cached to
        speed up the build process. By default, it is true.
        @param {string} options.buildDir Optional custom filesystem path for the output folder
        of the shifter. Default to an internal computation based on `locator.buildDir`.
        @param {object} options.args Optional shifter cli arguments. Defaults to
        `['--no-coverage', '--no-lint', '--silent', '--quiet', '--no-global-config']`
        @param {RegExp|Function} filter optional regular express or function to execute
        for each `evt.files`. If no `filter` is supplied, all modified files will be shifted.
        If the regular express is provided, it will be tested against every `evn.files`, testing
        the relative path to determine if the file should be shifted or not. In a function
        if provided, the function will be called for every `evt.files` with the following arguments:
            @param {Object} filter.bundle the current bundle to where the file belongs to
            @param {Object} filter.relativePath the relative path to the file from the bundle
            @param {boolean} filter.return Return true to indicate that the
            file should be shifted. Otherise the file will be skipped.

    @return {object} locator plugin
    **/
    plugin: function (options) {

        var yui = this;

        options = options || {};

        if (options.filter && utils.isRegExp(options.filter)) {
            // adding support for regular express instead of filter functions
            options.filter = function (bundle, relativePath) {
                return !!options.filter.test(relativePath);
            };
        }

        return {

            describe: utils.extend({
                summary: 'Plugin to build YUI Loader metadata for a bundle',
                types: ['*'],
                cache: true,
                args: ['--no-coverage', '--no-lint', '--silent', '--quiet', '--no-global-config']
            }, options),

            bundleUpdated: function (evt, api) {

                var self = this,
                    bundle = evt.bundle,
                    bundleName = bundle.name,
                    moduleName = 'loader-' + bundleName,
                    destination_path = moduleName + '.js',
                    meta,
                    builds,
                    files = [];

                if (!bundle.yuiBuildDirectory) {
                    // augmenting bundle obj with more metadata about yui
                    bundle.yuiBuildDirectory = options.buildDir || path.resolve(bundle.buildDirectory);
                }

                // getting the fullPath of all modified files that should be shifted in a form of an array
                Object.keys(evt.files || {}).forEach(function (element) {
                    // filtering out files based on filder if neded
                    if (!self.describe.filter || self.describe.filter(bundle, evt.files[element].relativePath)) {
                        // producing an array of fullPath values
                        files.push(evt.files[element].fullPath);
                    }
                });

                // getting all build.json that should be shifted
                builds = yui._buildsInBundle(bundleName, files, api.getBundleFiles(bundleName, { extensions: 'json' }));

                meta = yui._bundles && yui._bundles[bundleName];

                if (!meta || builds.length === 0) {
                    // this bundle does not have any yui module registered
                    return;
                }

                return api.promise(function (fulfilled, rejected) {

                    var server,
                        client,
                        serverMeta = {},
                        clientMeta = {},
                        mod,
                        build,
                        affinity;

                    // allocating metas for client and server
                    for (mod in meta) {
                        if (meta.hasOwnProperty(mod)) {
                            for (build in meta[mod].builds) {
                                if (meta[mod].builds.hasOwnProperty(build)) {
                                    affinity = meta[mod].builds[build].config && meta[mod].builds[build].config.affinity;
                                    if (affinity !== 'client') {
                                        // if not marked as client, it should be available on the server
                                        serverMeta[mod] = serverMeta[mod] || {
                                            name: meta[mod].name,
                                            buildfile: meta[mod].buildfile,
                                            builds: {}
                                        };
                                        serverMeta[mod].builds[build] = meta[mod].builds[build];
                                    }
                                    if (affinity !== 'server') {
                                        // if not marked as server, it should be available on the client
                                        clientMeta[mod] = clientMeta[mod] || {
                                            name: meta[mod].name,
                                            buildfile: meta[mod].buildfile,
                                            builds: {}
                                        };
                                        clientMeta[mod].builds[build] = meta[mod].builds[build];
                                    }
                                }
                            }
                        }
                    }

                    // defining the synthetically created meta module for client, it is not needed on the server
                    clientMeta[moduleName] = clientMeta[moduleName] || {
                        name: moduleName,
                        buildfile: destination_path,
                        builds: {}
                    };
                    clientMeta[moduleName].builds[moduleName] = {
                        name: moduleName,
                        config: {
                            affinity: 'client'
                        }
                    };

                    // computing the meta module
                    client = new (yui.BuilderClass)({
                        name: moduleName,
                        group: bundleName
                    });
                    client.compile(clientMeta);

                    return api.writeFileInBundle(bundleName, destination_path, client.data.js).then(function (newfile) {

                        // automatically registering new groups to be served
                        if (options.registerGroup) {

                            yui.registerGroup(bundle.name, bundle.yuiBuildDirectory, newfile);

                            // automatically register modules into a server instance if needed
                            if (options.registerServerModules) {

                                // computing the metas for the server side
                                server = new (yui.BuilderClass)({
                                    name: moduleName + '-server',
                                    group: bundleName
                                });
                                server.compile(serverMeta);

                                // registering server affinity modules on the server
                                yui.registerModules(bundleName, (utils.isFunction(options.registerServerModules) ?
                                        options.registerServerModules(bundleName, server.data.json) :
                                        server.data.json));

                                // automatically attaching modules into a server instance if needed
                                if (options.useServerModules) {
                                    yui.attachModules(bundleName, (utils.isFunction(options.useServerModules) ?
                                            options.useServerModules(bundleName, Object.keys(server.data.json)) :
                                            Object.keys(server.data.json)));
                                }

                            }

                        }

                        // adding the new meta module into the builds collection
                        builds.push(newfile);
                        yui.shiftFiles(builds, {
                            buildDir: bundle.yuiBuildDirectory,
                            args: self.describe.args,
                            cache: self.describe.cache
                        }, function (e) {
                            if (e) {
                                rejected(e);
                                return;
                            }
                            fulfilled();
                        });

                    }, rejected);

                });

            }

        };

    },

    /**
    Analyze modified files and build.json files to infer the list of files that
    should be shifted.

    @method _buildsInBundle
    @protected
    @param {string} bundleName The bundle name to be registered.
    @param {array} modifiedFiles The filesystem path for all modified files in bundle.
    @param {array} jsonFiles The filesystem path for all json files in bundle.
    @return {array} The filesystem path for all files that should be shifted using shifter
    **/
    _buildsInBundle: function (bundleName, modifiedFiles, jsonFiles) {
        var file,
            skip,
            dir,
            mod,
            i,
            m,
            builds = [];

        // validating and ordering the list of files to make sure they are processed
        // in the same order every time to generate the metas. If the order is not
        // preserved, your CI might generate a re-ordered meta module that might
        // invalidate cache due to the nature of the promises used in locator that
        // are async by nature.
        modifiedFiles = (modifiedFiles && modifiedFiles.sort()) || [];
        jsonFiles = (jsonFiles && jsonFiles.sort()) || [];

        // looking for modified yui modules
        for (m = 0; m < modifiedFiles.length; m += 1) {
            file = modifiedFiles[m];
            // there is not need to add loader meta module into builds collection
            if (path.extname(file) === '.js' && path.basename(file) !== 'loader-' + bundleName + '.js') {
                mod = this._checkYUIModule(file);
                if (mod) {
                    this.register(bundleName, file, mod);
                    builds.push(file);
                }
            }
        }

        // looking for build.json
        for (i = 0; i < jsonFiles.length; i += 1) {
            if (path.basename(jsonFiles[i]) === 'build.json') {
                mod = this._checkBuildFile(jsonFiles[i]);
                if (mod) {
                    skip = true;
                    dir = path.dirname(jsonFiles[i]);
                    for (m = 0; m < modifiedFiles.length; m += 1) {
                        file = modifiedFiles[m];
                        // if build.json itself was modified, we should not skip
                        if (file === jsonFiles[i]) {
                            skip = false;
                        }
                        // if there is a modified .js file in the range, we should not skip
                        if (path.extname(file) === '.js' && file.indexOf(dir) === 0) {
                            skip = false;
                        }
                    }
                    this.register(bundleName, jsonFiles[i], mod);
                    // build only if at least one file from modified is under the dirname of build.json, or
                    // build.json was modified
                    if (!skip) {
                        builds.push(jsonFiles[i]);
                    }
                }
            }
        }

        return builds;
    }

};