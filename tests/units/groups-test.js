/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
*/

/*jslint node:true, nomen:true*/

var YUITest = require('yuitest'),
    A = YUITest.Assert,
    OA = YUITest.ObjectAssert,
    suite,
    groups = require('../../lib/groups.js'),
    moduleConfigPath = __dirname + '/../fixtures/app-module.js',
    moduleConfigPath2 = __dirname + '/../fixtures/metas.js',
    moduleConfigPath3 = __dirname + '/../fixtures/metas-parsed-error.js',
    moduleConfigPath4 = __dirname + '/../fixtures/metas-run-error.js';


suite = new YUITest.TestSuite("group-test suite");

suite.add(new YUITest.TestCase({
    name: "group-test",

    "test constructor": function () {
        A.isNotNull(groups, "groups require failed");
    },

    // TODO:
    "test getGroupConfig with invalid path": function () {
        A.isFunction(groups.getGroupConfig);
    },

    "test getGroupConfig (only)": function () {
        A.isFunction(groups.getGroupConfig);

        var res,
            fn,
            fnCalled = false;

        fn = groups._captureYUIModuleDetails;
        groups._captureYUIModuleDetails = function (path) {
            var out;
            fnCalled = true;
            // fake the return value
            out = {
                yui: {
                    groups: {
                        app: {
                            modules: [ 'foo1' ]
                        }
                    },
                    name: 'moduleName',
                    version: '22',
                    meta: {
                        requires: [ 'foo2' ]
                    }
                }
            };

            A.areEqual(moduleConfigPath,
                       path,
                       'res.path does not match original path');
            return out;
        };
        res = groups.getGroupConfig(moduleConfigPath);

        A.areEqual(true, fnCalled, 'captureFn was not called');
        A.areEqual('moduleName', res.moduleName, 'res.moduleName mismatch');
        A.areEqual('22', res.moduleVersion, 'res.moduleVersion mismatch');
        A.areEqual('app', res.groupName, 'wrong groupName');

        groups._captureYUIModuleDetails = fn;
    },

    // test using fixture app-module.js
    "test getGroupConfig": function () {

        var config;
        config = groups.getGroupConfig(moduleConfigPath);

        // verify
        A.areEqual('app-module', config.moduleName, 'config.name does not match');
        A.areEqual('0.0.1', config.moduleVersion, 'config.version does not match');
        A.areEqual('yui-base', config.requires[0], 'yui-base does not match');
        A.areEqual('loader-base', config.requires[1], 'loader-base does not match');
        A.areEqual('loader-yui3', config.requires[2], 'loader-yui3 does not match');
        A.areEqual('app', config.groupName, 'groups name mismatch');
        A.isNotUndefined(config.modules['module-A'], 'module-A missing');
        A.isNotUndefined(config.modules['module-B'], 'module-A missing');

        A.areEqual('module-B',
                   config.modules['module-A'].requires[0],
                   'module-B is a dependency of module-A');

    },

    // test using fixture metas.js
    "test metas": function () {

        A.isFunction(groups.getGroupConfig);
        var config;
        config = groups.getGroupConfig(moduleConfigPath2);
        // console.log(config);

        A.areEqual('metas', config.moduleName, 'config.name mismatch');
        A.areEqual('0.0.1', config.moduleVersion, 'config.version mismatch');
        A.isNotUndefined(config.modules,
                         'config.groups.modules should be set');
        A.areEqual('css',
                   config.modules.xyz.type,
                   'wrong type');
        A.areEqual('baz',
                   config.modules.xyz.requires[0],
                   'wrong requires');
    },

    "test createSandbox": function () {
        A.isFunction(groups._createSandbox);

        var sandbox = groups._createSandbox();

        A.isNotUndefined(sandbox.config, 'sandbox.config missing');
        A.isNotUndefined(sandbox.modown, 'sandbox.modown missing');
        A.isFunction(sandbox.merge);
        A.isFunction(sandbox.applyConfig);

        sandbox.applyConfig({groups: { app: { path: 'foobar' } } });
        OA.areEqual({ path: 'foobar' },
                    sandbox.modown.groups.app,
                    "wrong groups app meta");
    },

    "test captureYUIModuleDetails with parse error": function () {
        A.isFunction(groups._captureYUIModuleDetails);

        var out;

        out = groups._captureYUIModuleDetails(moduleConfigPath3);
        A.isUndefined(out.yui.name, 'name should be undefined');
    },

    "test captureYUIModuleDetails with runtime error": function () {
        A.isFunction(groups._captureYUIModuleDetails);

        var yui;

        yui = groups._captureYUIModuleDetails(moduleConfigPath4);
        yui = yui.yui || {};
        A.isNotUndefined(yui.name, 'name should be defined');
        A.isUndefined(yui.groups, 'groups should be undefined');
    }


}));

YUITest.TestRunner.add(suite);
