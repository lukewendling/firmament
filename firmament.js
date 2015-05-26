#!/usr/local/node/bin/node

start();

function start() {
    assignStaticGlobals();
    require_ResolveModuleDependencies(function () {
        util_SetupConsoleTable();
        commander_CreateCommanderCommandMap();
        util_EnterUnhandledExceptionWrapper(commander_Configure);
    });
}

function assignStaticGlobals() {
    global.VERSION = '0.0.2';
    global.configFilename = 'firmament.json';

    global.slowToLoadModuleDependencies = {
        "docker-remote-api": "^4.4.1",
        "command-line-args": "^0.5.9",
        "nodegit": "^0.4.0",
        "commander": "^2.8.1",
        "jsonfile": "^2.0.0",
        "terminal-colors": "^0.1.3",
        "single-line-log": "^0.4.1",
        "yesno": "^0.0.1",
        "corporal": "^0.5.1",
        "deep-extend": "^0.4.0",
        "strong-deploy": "^2.2.1",
        "strong-build": "^2.0.0",
        "easy-table": "^0.3.0",
        "util": "^0.10.3"
    };

    global.moduleDependencies = {
        "nimble": "^0.0.2"
    };

    global.ROOT_docker_Desc = 'Issue Docker commands to local or remote Docker server';
    global.ROOT_make_Desc = 'Issue make commands to build and deploy Docker containers';
    global.DOCKER_ps_Desc = 'Show running containers';
    global.DOCKER_ps_all_Desc = "Show all containers, even ones that aren't running";
    global.MAKE_build_Desc = "Construct container cluster from the specified filename or 'firmament.json'";
    global.MAKE_build_file_Desc = 'Name of file to read for container configurations';
    global.MAKE_template_Desc = "Write a makefile template to the specified filename or 'firmament.json'";
    global.MAKE_template_full_Desc = 'Write full container descriptor (quite large)';
    global.MAKE_template_file_Desc = 'Name of file to write makefile template to';
}

function getDockerContainerConfigTemplate() {
    return [
        {
            name: 'mongo',
            Image: 'mongo',
            Hostname: 'mongo'
        },
        {
            name: 'swagger',
            Image: 'strongloop/strong-pm',
            Hostname: 'swagger',
            ExposedPorts: {
                '3001/tcp': {}
            },
            HostConfig: {
                Links: ['mongo:mongo'],
                PortBindings: {
                    '3001/tcp': [{HostPort: '3001'}],
                    '8701/tcp': [{HostPort: '8701'}]
                }
            },
            ExpressApp: {
                GitUrl: 'https://github.com/jreeme/TestSLC'
            }
        }
    ];
}

function getDockerContainerDefaultDescriptor() {
    return {
        Image: '',
        Hostname: '',
        Domainname: '',
        User: '',
        AttachStdin: false,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        OpenStdin: false,
        StdinOnce: false,
        Env: ['ENV0=how now brown cow', 'ENV1=320'],
        Cmd: [],
        Entrypoint: '',
        Labels: {
            'version': '1.0'
        },
        Volumes: {
            '/tmp': {}
        },
        WorkingDir: '',
        NetworkDisabled: false,
        MacAddress: '',
        ExposedPorts: {
            //'22/tcp': {}
        },
        SecurityOpts: [''],
        HostConfig: {
            Binds: null,
            BindsExample: ['/tmp:/tmp'],
            Links: null,
            LinksExample: ['redis:redis'],
            LxcConf: {'lxc.utsname': 'docker'},
            Memory: 0,
            MemorySwap: 0,
            CpuShares: 512,
            CpusetCpus: null,
            PortBindings: null,
            PortBindingsExample: {'22/tcp': [{'HostPort': '11022'}]},
            PublishAllPorts: false,
            Privileged: false,
            ReadonlyRootfs: false,
            Dns: null,
            DnsExample: ['8.8.8.8', '9.9.9.9'],
            DnsSearch: null,
            ExtraHosts: null,
            ExtraHostsExample: ['localhost:127.0.0.1'],
            VolumesFrom: null,
            VolumesFromExample: ['containerName[:<ro|rw>]'],
            CapAdd: ['NET_ADMIN'],
            CapDrop: ['MKNOD'],
            RestartPolicy: {'Name': '', 'MaximumRetryCount': 0},
            RestartPolicyExample: {'Name': '<always|on-failure>', 'MaximumRetryCount': 0},
            NetworkMode: 'bridge',
            Devices: null,
            Ulimits: null,
            LogConfig: {'Type': 'json-file', Config: {}},
            CgroupParent: ''
        }
    };
}

//vvvv--> Configure CLI & Commander (Add commands & so forth)
function commander_CreateCommanderCommandMap() {
    var deepExtend = requireCache('deep-extend');
    global.commander_CommandMap = {
        root: function (commander) {
            commander
                .version(global.VERSION)
            commander
                .command('docker')
                .alias('d')
                .description(global.ROOT_docker_Desc);
            commander
                .command('make')
                .alias('m')
                .description(global.ROOT_make_Desc);
        },
        docker: function (commander) {
            commander
                .command('ps [options]')
                .description(global.DOCKER_ps_Desc.green)
                .option('-a, --all', global.DOCKER_ps_all_Desc)
                .action(function (cmd, options) {
                    docker_PS(options, function (err, containers) {
                        docker_PrettyPrintDockerContainerList(err, containers);
                    });
                });
        },
        make: function (commander) {
            commander
                .command('build [filename]')
                .alias('b')
                .description(global.MAKE_build_Desc)
                .action(function (filename) {
                    make_BUILD(filename || global.configFilename);
                });
            commander
                .command('template [filename]')
                .alias('t')
                .description(global.MAKE_template_Desc)
                .option('-f, --full', global.MAKE_template_full_Desc)
                .action(function (filename, options) {
                    make_TEMPLATE(filename, options);
                });
        }
    };
    global.commandAlias = {};
    var commanderByAliasMap = {};
    for (var command in global.commander_CommandMap) {
        global.commandAlias[command.charAt(0)] = global.commandAlias[command] = command;
        commanderByAliasMap[command.charAt(0)] = global.commander_CommandMap[command];
    }
    deepExtend(global.commander_CommandMap, commanderByAliasMap);
}

function cli_Enter(cmd) {
    var nimble = requireCache('nimble');
    var commands = {};
    switch (cmd) {
        case('d'):
        case('docker'):
            commands['ps'] =
            {
                'description': global.DOCKER_ps_Desc,
                'invoke': function (session, args, corporalCallback) {
                    try {
                        var options = cli_GetOptions([
                            {
                                name: 'all',
                                type: Boolean,
                                alias: 'a',
                                description: global.DOCKER_ps_all_Desc
                            }
                        ], args);
                        nimble.series([function (nimbleCallback) {
                            docker_PS(options, function (err, containers) {
                                docker_PrettyPrintDockerContainerList(err, containers);
                                nimbleCallback();
                            })
                        }], corporalCallback);
                    } catch (err) {
                        console.log(err);
                        corporalCallback();
                    }
                }
            };
        case('m'):
        case('make'):
            commands['b'] =
                commands['build'] =
                {
                    'description': global.MAKE_build_Desc,
                    'invoke': function (session, args, corporalCallback) {
                        try {
                            var options = cli_GetOptions([
                                {
                                    name: 'file',
                                    type: String,
                                    defaultOption: true,
                                    description: global.MAKE_build_file_Desc
                                }
                            ], args);
                            if (options) {
                                nimble.series([function (nimbleCallback) {
                                    make_BUILD(filename || global.configFilename, nimbleCallback);
                                }], corporalCallback);
                            } else {
                                corporalCallback();
                            }
                        } catch (err) {
                            console.log(err);
                            corporalCallback();
                        }
                    }
                };
            break;
            commands['t'] =
                commands['template'] =
                {
                    'description': global.MAKE_template_Desc,
                    'invoke': function (session, args, corporalCallback) {
                        try {
                            var options = cli_GetOptions([
                                {
                                    name: 'full',
                                    type: Boolean,
                                    alias: 'f',
                                    description: global.MAKE_template_full_Desc
                                },
                                {
                                    name: 'file',
                                    type: String,
                                    defaultOption: true,
                                    description: global.MAKE_template_file_Desc
                                }
                            ], args);
                            if (options) {
                                nimble.series([function (nimbleCallback) {
                                    make_TEMPLATE(filename || global.configFilename, options, nimbleCallback);
                                }], corporalCallback);
                            } else {
                                corporalCallback();
                            }
                        } catch (err) {
                            console.log(err);
                            corporalCallback();
                        }
                    }

                };
            break;
        default:
            //Indicate to caller this is an unknown command
            return -1;
    }
    cli_CorporalLoop(cmd, commands);
    return 0;
}

//^^^^--> Configure CLI & Commander (Add commands & so forth)

//Docker Command Handlers
function docker_PS(options, callback) {
    var docker = requireCache('docker-remote-api');
    var request = docker({host: '/var/run/docker.sock'});
    callback = callback || util_Exit;
    var queryString = {all: options.all};
    request.get('/containers/json', {qs: queryString, json: true}, function (err, containers) {
        callback(err, containers);
    });
}

function docker_PrettyPrintDockerContainerList(err, containers) {
    var colors = requireCache('terminal-colors');
    if (err) {
        console.log(err);
    }
    containers.sort(function (a, b) {
        return (a.Id < b.Id) ? -1 : 1
    });
    var displayContainers = [];
    var ourId = 0;
    containers.forEach(function (container) {
        var ourIdString = (++ourId).toString();
        var displayContainer = {
            ID: ourIdString,
            Name: container.Names[0].substring(1),
            Image: container.Image,
            DockerId: container.Id.substring(1, 12)
        };
        displayContainers.push(displayContainer);
    });
    console.table(displayContainers);
}

function docker_ProcessContainerConfigs(containerConfigs, processingCompleteCallback) {
    var deepExtend = requireCache('deep-extend');
    var docker = requireCache('docker-remote-api');
    var request = docker({host: '/var/run/docker.sock'});
    var sortedContainerConfigs = makefile_ContainerDependencySort(containerConfigs);
    var functionArray = [];

    /*    request.post('/containers/7aa8/start', {json:{Binds:['/tmp:/tmp']}}, function (err, result) {
     console.log(err || result);
     });
     return;*/
    sortedContainerConfigs.forEach(function (containerConfig) {
        functionArray.push(function (callback) {
            var fullContainerConfigCopy = {};
            deepExtend(fullContainerConfigCopy, getDockerContainerDefaultDescriptor());
            deepExtend(fullContainerConfigCopy, containerConfig);
            var queryString = {name: fullContainerConfigCopy.name};
            request.post('/containers/create', {
                json: fullContainerConfigCopy,
                qs: queryString
            }, function (err, result) {
                console.log(err || result);
                callback();
            });
        });
    });
    var nimble = requireCache('nimble');
    var containers = [];
    nimble.series([
        function (nimbleCallback) {
            nimble.parallel(functionArray, function () {
                nimbleCallback();
            });
        },
        function (nimbleCallback) {
            docker_PS({all: true}, function (err, res) {
                containers = res;
                nimbleCallback();
            })
        },
        function (nimbleCallback) {
            functionArray = [];
            sortedContainerConfigs.forEach(function (containerConfig) {
                var testName = '/' + containerConfig.name;
                containers.forEach(function (container) {
                    container.Names.forEach(function (name) {
                        if (testName === name) {
                            functionArray.push(function (nimbleCallback) {
                                var restCmd = '/containers/' + container.Id + '/start';
                                request.post(restCmd, {json: {Dns: null}}, function (err, result) {
                                    console.log(err || result);
                                    nimbleCallback();
                                });
                            });
                        }
                    });
                });
            });
            nimble.series(functionArray, nimbleCallback);
        },
        function (nimbleCallback) {
            sortedContainerConfigs.forEach(function (containerConfig) {
                if (containerConfig.ExpressApp) {
                    if (containerConfig.ExpressApp.GitUrl) {
                        var nodeGit = requireCache('nodegit');
                        nodeGit.Clone(containerConfig.ExpressApp.GitUrl, containerConfig.name)
                            .then(function (repo) {
                                process.chdir(containerConfig.name);
                                console.log('Building');
                                var argv = [];
                                argv.unshift(process.argv[1]);
                                argv.unshift(process.argv[0]);
                                requireCache('strong-build').build(argv, function () {
                                    var strongDeploy = require('strong-deploy');
                                    strongDeploy(process.cwd(),
                                        'http://localhost:8701', 'jr_service', 'deploy', function () {
                                            console.log('Deployed');
                                            nimbleCallback();
                                        });
                                    console.log('Built');
                                })
                            });
                    }
                }
            });
        }
    ], processingCompleteCallback);
}

//Make Command Handlers
function make_BUILD(filename, options, callback) {
    var jsonFile = requireCache('jsonfile');
    console.log("Constructing Docker containers described in: '" + filename + "'");
    var containerDescriptors = jsonFile.readFileSync(filename);
    console.log(containerDescriptors);
    docker_ProcessContainerConfigs(containerDescriptors, callback);
}

function make_TEMPLATE(filename, options, callback) {
    console.log("\nCreating JSON template file '" + filename.yellow + "' ...");
    var fs = requireCache('fs');
    if (fs.existsSync(filename)) {
        var yesno = requireCache('yesno');
        yesno.ask("Config file '" + filename + "' already exists. Overwrite? [Y/n]", true, function (ok) {
            if (ok) {
                util_WriteTemplateFile(filename, options.full);
                callback();
            }
        });
    } else {
        util_WriteTemplateFile(templateFilename, params.full);
        callback();
    }
}

function util_WriteTemplateFile(templateFilename, full) {
    var objectToWrite = full ? [getDockerContainerDefaultDescriptor()] : getDockerContainerConfigTemplate()
    util_WriteJsonObjectToFile(templateFilename, objectToWrite);
}

//Corporal CLI helpers
function cli_CorporalLoop(cmd, commands) {
    var Corporal = requireCache('corporal');
    var corporal = new Corporal({
        'commands': commands,
        'env': {
            'ps1': global.commandAlias[cmd].yellow + '->> '.green,
            'ps2': '>> '.green
        }
    });
    corporal.on('load', corporal.loop);
}

function cli_GetOptions(argArray, args) {
    var cliArgs = requireCache('command-line-args');
    var commonArgArray = [
        {
            name: 'help',
            type: Boolean,
            alias: 'h',
            description: 'Show usage instructions'
        }
    ];
    Array.prototype.push.apply(commonArgArray, argArray);
    var cli = cliArgs(commonArgArray);
    var options = cli.parse(args);
    if (options.help) {
        console.log(cli.getUsage());
        return null;
    }
    return options;
}

//Commander helpers
function commander_TestCommandLineArgs(args) {
    //Here we just make sure switches are contiguous (not broken up by args)
    var argsCopy = args.slice(0);
    var seenOptions = false;
    var seenArgs = false;
    while (argsCopy.length) {
        var arg = argsCopy.shift();
        if (/^-+/.test(arg)) {
            if (seenArgs && seenOptions) {
                util_Fatal({Message: 'Poorly formed command'})
            }
            seenOptions = true;
        } else {
            seenArgs = seenOptions;
        }
    }
}

function commander_LoadRootCommand(commander) {
    global.commander_CommandMap['root'](commander);
    commander.parse(process.argv);
}

function commander_OutputTopLevelHelp(commander) {
    commander_LoadRootCommand(commander);
    commander.help();
}

function commander_Configure() {
    var path = requireCache('path');
    var commander = requireCache('commander');
    var nodePath = process.argv[0];
    var scriptPath = process.argv[1];
    var cmdArray = process.argv.slice(2);

    commander_TestCommandLineArgs(cmdArray);

    switch (cmdArray.length) {
        case(0):
            //$ firmament with no arguments
            commander_OutputTopLevelHelp(commander);
            break;
        case(1):
            if (/^-+/.test(cmdArray[0])) {
                //It's a switch
                commander_LoadRootCommand(commander);
            } else {
                //It's a standalone command (no switches or sub-commands)
                if (cli_Enter(cmdArray[0])) {
                    //It's a command we've never heard of
                    commander_OutputTopLevelHelp(commander);
                }
            }
            break;
        default:
            //It's some arbitrary command line we need to do one-shot
            var commanderConfig = global.commander_CommandMap[cmdArray[0]];
            if (!commanderConfig) {
                commander_OutputTopLevelHelp(commander);
            }
            commander._name = path.basename(scriptPath, '.js');
            commander._name += ' ' + global.commandAlias[cmdArray[0]];
            commanderConfig(commander);
            cmdArray.unshift(nodePath);
            commander.parse(cmdArray);
            break;
    }
}

//Functions to deal with interpreting our 'makefiles'
function makefile_ContainerDependencySort(containerConfigs) {
    var sortedContainerConfigs = [];
    //Sort on linked container dependencies
    var objectToSort = {};
    var containerConfigByNameMap = {};
    containerConfigs.forEach(function (containerConfig) {
        if (containerConfigByNameMap[containerConfig.name]) {
            util_Fatal({Message: 'Same name is used by more than one container.'})
        }
        containerConfigByNameMap[containerConfig.name] = containerConfig;
        var dependencies = [];
        if (containerConfig.HostConfig && containerConfig.HostConfig.Links) {
            containerConfig.HostConfig.Links.forEach(function (link) {
                var linkName = link.split(':')[0];
                dependencies.push(linkName);
            });
        }
        objectToSort[containerConfig.name] = dependencies;
    });
    var sortedContainerNames = util_TopologicalDependencySort(objectToSort);
    sortedContainerNames.forEach(function (sortedContainerName) {
        sortedContainerConfigs.push(containerConfigByNameMap[sortedContainerName]);
    });
    return sortedContainerConfigs;
}

//Module resolution (get what we need from NPM)

function requireCache(moduleName) {
    if (global.require_Cache[moduleName]) {
        return global.require_Cache[moduleName];
    }

    try {
        return global.require_Cache[moduleName] = require(moduleName);
    } catch (ex) {
        if (ex.code !== 'MODULE_NOT_FOUND') {
            util_Fatal(ex);
        }
    }

    var nimble = requireCache('nimble');
    nimble.series([
        function (nimbleCallback) {
            console.log("Looking for '" + moduleName + "' in dependency list ...")
            var version = global.slowToLoadModuleDependencies[moduleName];
            var modulesToDownload = [version ? moduleName + '@' + global.slowToLoadModuleDependencies[moduleName] : moduleName];
            require_NpmInstall(modulesToDownload, nimbleCallback);
        }
    ], function () {
        console.log("Installed: '" + moduleName + "' ...")
    });

    return global.require_Cache[moduleName];
}

function require_NpmInstall(modulesToDownload, callback) {
    var npm = global.require_Cache['npm'];
    if (!npm) {
        var childProcess = requireCache('child_process');
        var childProcessOutput = childProcess.execSync('npm root -g', {encoding: 'utf8'});
        childProcessOutput = childProcessOutput.replace(/\n$/, '');
        npm = require(childProcessOutput + '/npm');
        npm = global.require_Cache['npm'] = require(childProcessOutput + '/npm');
    }

    var nimble = requireCache('nimble');
    nimble.series([
            function (nimbleCallback) {
                npm.load({loaded: false}, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        /*                    npm.on('log', function (msg) {
                         console.log(msg);
                         });*/

                        var wait = require('wait.for');
                        var data = wait.for(npm.commands.install, modulesToDownload);
                        var d= data;
/*                        npm.commands.install(modulesToDownload, function (err, data) {
                            if (err) {
                                util_Fatal(err);
                            }
                            console.log(data);
                            for (var key in global.moduleDependencies) {
                                global.require_Cache[key] = global.require_Cache[key] || require(key);
                            }
                        });*/
                    }
                });
            }
        ],
        function () {
            callback();
        });
}

function require_ResolveModuleDependencies(callback) {
    global.require_Cache = {};
    global.require_Cache['fs'] = require('fs');
    global.require_Cache['path'] = require('path');

    var modulesToDownload = [];

    for (var key in global.moduleDependencies) {
        try {
            global.require_Cache[key] = require(key);
        } catch (ex) {
            if (ex.code !== 'MODULE_NOT_FOUND') {
                util_Fatal(ex);
            }
            modulesToDownload.push(key + '@' + global.moduleDependencies[key]);
        }
    }

    if (modulesToDownload.length) {
        console.log("\nLooks like we're a few bricks short of a load!");
        console.log("\nI'll try to find what we're missing ...\n");
        console.log(modulesToDownload);

        var childProcess = require('child_process');
        var childProcessOutput = childProcess.execSync('npm root -g', {encoding: 'utf8'});

        childProcessOutput = childProcessOutput.replace(/\n$/, '');
        var npm = require(childProcessOutput + '/npm');
        npm.load({loaded: false}, function (err) {
            if (err) {
                console.log(err);
            } else {
                npm.on('log', function (msg) {
                    console.log(msg);
                });
                npm.commands.install(modulesToDownload, function (err, data) {
                    if (err) {
                        util_Fatal(err);
                    }
                    console.log(data);
                    for (var key in global.moduleDependencies) {
                        global.require_Cache[key] = global.require_Cache[key] || require(key);
                    }
                    callback();
                });
            }
        });
    } else {
        callback();
    }
}

//Uncategorized utility functions
function util_WriteJsonObjectToFile(path, obj) {
    var jsonFile = requireCache('jsonfile');
    jsonFile.writeFileSync(path, obj);
}

function util_TopologicalDependencySort(graph) {
    var sorted = [], // sorted list of IDs ( returned value )
        visited = {}; // hash: id of already visited node => true

    // 2. topological sort
    try {
        Object.keys(graph).forEach(function visit(name, ancestors) {
            // if already exists, do nothing
            if (visited[name]) {
                return
            }

            if (!Array.isArray(ancestors)) {
                ancestors = []
            }
            ancestors.push(name);
            visited[name] = true;

            var deps = graph[name];
            deps.forEach(function (dep) {
                if (ancestors.indexOf(dep) >= 0) {
                    util_Fatal({Message: 'Circular dependency "' + dep + '" is required by "' + name + '": ' + ancestors.join(' -> ')});
                }

                visit(dep, ancestors.slice(0)); // recursive call
            });

            sorted.push(name);
        });
    } catch (ex) {
        util_Fatal({Message: 'Linked container dependency sort failed. You are probably trying to link to an unknown container.'});
    }
    return sorted;
}

function util_EnterUnhandledExceptionWrapper(fn) {
    try {
        fn();
    } catch (ex) {
        util_Fatal(ex);
    }
}

function util_Exit(code) {
    process.exit(code);
}

function util_Fatal(ex) {
    console.log("\nMan, sorry. Something bad happened and I can't continue. :(".yellow)
    console.log("\nHere's all I know:\n".yellow);
    console.log(ex);
    console.log('\n');
    util_Exit(1);
}

function util_SetupConsoleTable() {
    if (typeof console === 'undefined') {
        throw new Error('Weird, console object is undefined');
    }
    if (typeof console.table === 'function') {
        return;
    }

    var table = requireCache('easy-table');

    function arrayToString(arr) {
        var t = new table();
        arr.forEach(function (record) {
            if (typeof record === 'string' ||
                typeof record === 'number') {
                t.cell('item', record);
            } else {
                // assume plain object
                Object.keys(record).forEach(function (property) {
                    t.cell(property, record[property]);
                });
            }
            t.newRow();
        });
        return t.toString();
    }

    function printTitleTable(title, arr) {
        var str = arrayToString(arr);
        var rowLength = str.indexOf('\n');
        if (rowLength > 0) {
            if (title.length > rowLength) {
                rowLength = title.length;
            }
            console.log(title);
            var sep = '-', k, line = '';
            for (k = 0; k < rowLength; k += 1) {
                line += sep;
            }
            console.log(line);
        }
        console.log(str);
    }

    function objectToArray(obj) {
        var keys = Object.keys(obj);
        return keys.map(function (key) {
            return {
                key: key,
                value: obj[key]
            };
        });
    }

    function objectToString(obj) {
        return arrayToString(objectToArray(obj));
    }

    console.table = function () {
        var args = Array.prototype.slice.call(arguments);

        if (args.length === 2 &&
            typeof args[0] === 'string' &&
            Array.isArray(args[1])) {

            return printTitleTable(args[0], args[1]);
        }
        args.forEach(function (k) {
            if (typeof k === 'string') {
                return console.log(k);
            } else if (Array.isArray(k)) {
                console.log(arrayToString(k));
            } else if (typeof k === 'object') {
                console.log(objectToString(k));
            }
        });
    };
}
