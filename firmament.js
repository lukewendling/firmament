#!/usr/local/node/bin/node

start();

function start() {
    assignStaticGlobals();
    require_ResolveModuleDependencies(function(){
        commander_CreateCommanderCommandMap();
        util_EnterUnhandledExceptionWrapper(letThereBeLight);
    });
}

function assignStaticGlobals() {
    global.VERSION = '0.0.2';
    global.configFilename = 'firmament.json';

    global.moduleDependencies = {
        "docker-remote-api": "^4.4.1",
        "command-line-args": "^0.5.9",
        "commander": "^2.8.1",
        "check-types": "^3.2.0",
        "jsonfile": "^2.0.0",
        "colors": "^1.1.0",
        "single-line-log": "^0.4.1",
        "yesno": "^0.0.1",
        "nimble": "^0.0.2",
        "corporal": "^0.5.1",
        "deep-extend": "^0.4.0",
        //"strong-deploy": "^2.2.0",
        //"strong-build": "^2.0.0",
        "util": "^0.10.3"
    };

    global.ROOT_docker_Desc = 'Issue Docker commands to local or remote Docker server';
    global.ROOT_make_Desc = 'Issue make commands to build and deploy Docker containers';
    global.DOCKER_ps_Desc = 'Show running containers';
    global.DOCKER_ps_all_Desc = "Show all containers, even ones that aren't running";
    global.MAKE_template_Desc = "Write a makefile template to the specified filename or 'firmament.json'";
    global.MAKE_template_file_Desc = 'Filename to write makefile template to';
}

function letThereBeLight() {
    commander_Configure();
    return;
    if (commander.template) {
        //User has specified '-t'
        var checkType = global.require_Cache['check-types'];
        var templateFilename = checkType.string(commander.template) ? commander.template : global.configFilename;
        console.log("\nCreating JSON template file '" + templateFilename + "' ...");
        var fs = global.require_Cache['fs'];
        if (fs.existsSync(templateFilename)) {
            var yesno = global.require_Cache['yesno'];
            yesno.ask("Config file '" + templateFilename + "' already exists. Overwrite? [Y/n]", true, function (ok) {
                if (ok) {
                    util_WriteJsonObjectToFileThenQuit(templateFilename, configFileTemplate);
                } else {
                    util_Exit(0);
                }
            });
        } else {
            util_WriteJsonObjectToFileThenQuit(templateFilename, configFileTemplate);
        }
    } else {
        var jsonFile = global.require_Cache['jsonfile'];
        //Let's try to set things up according to config files
        var configFiles = commander.args.length ? commander.args : [global.configFilename];
        var containerConfigs = [];
        configFiles.forEach(function (configFile) {
            try {
                Array.prototype.push.apply(containerConfigs, jsonFile.readFileSync(configFile));
            }
            catch (ex) {
                util_Fatal(ex);
            }
        });
        processContainerConfigs(containerConfigs);
    }
}

function processContainerConfigs(containerConfigs) {
    var deepExtend = global.require_Cache['deep-extend'];
    var docker = global.require_Cache['docker-remote-api'];
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
            deepExtend(fullContainerConfigCopy, containerFullConfig);
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
    var nimble = global.require_Cache['nimble'];
    var containers = [];
    nimble.series([
        function (callback) {
            nimble.parallel(functionArray, function () {
                callback();
            });
        },
        function (callback) {
            docker_DoCommand('ps', {all: true}, function (err, res) {
                containers = res;
                callback();
            });
        },
        function (callback) {
            functionArray = [];
            sortedContainerConfigs.forEach(function (containerConfig) {
                var testName = '/' + containerConfig.name;
                containers.forEach(function (container) {
                    container.Names.forEach(function (name) {
                        if (testName === name) {
                            functionArray.push(function (callback) {
                                var restCmd = '/containers/' + container.Id + '/start';
                                request.post(restCmd, {json: {Dns: null}}, function (err, result) {
                                    console.log(err || result);
                                    callback();
                                });
                            });
                        }
                    });
                });
            });
            nimble.series(functionArray, callback);
        }
    ]);
}

function startContainersSerially(containerConfigs) {
    var containerConfig = containerConfigs.shift();
    if (!containerConfig) {
        return;
    }
    docker_DoCommand('ps', {all: true}, function (err, containers) {
        var testName = '/' + containerConfig.name;
        for (var i = 0; i < containers.length; ++i) {
            var container = containers[i];
            for (var j = 0; j < container.Names.length; ++j) {
                var name = container.Names[j];
                if (testName === name) {
                    var docker = global.require_Cache['docker-remote-api'];
                    var request = docker({host: '/var/run/docker.sock'});

                    var restCmd = '/containers/' + container.Id + '/start';
                    request.post(restCmd, function (err, result) {
                        if (err) {
                            util_Fatal(err);
                        }
                        console.log(result);
                        startContainersSerially(containerConfigs);
                    });
                    return;
                }
            }
        }
    });
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
            HostConfig: {
                Links: ['mongo:mongo'],
                PortBindings: {
                    '3000/tcp': [{HostPort: '3000'}],
                    '8701/tcp': [{HostPort: '8701'}]
                }
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
    var deepExtend = global.require_Cache['deep-extend'];
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
                    docker_DoCommand('ps', options);
                });
        },
        make: function (commander) {
            commander
                .command('template [filename]')
                .alias('t')
                .description(global.MAKE_template_Desc)
                .action(function (filename) {
                    make_DoCommand('template', filename || global.configFilename);
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
    var nimble = global.require_Cache['nimble'];
    var commands = {};
    switch (cmd) {
        case('d'):
        case('docker'):
            commands['ps'] =
            {
                'description': global.DOCKER_ps_Desc,
                'invoke': function (session, args, corporalCallback) {
                    var options = cli_GetOptions([
                        {
                            name: 'all',
                            type: Boolean,
                            alias: 'a',
                            description: global.DOCKER_ps_all_Desc
                        }
                    ], args);
                    nimble.series([function (nimbleCallback) {
                        docker_DoCommand('ps', options, nimbleCallback);
                    }], corporalCallback);
                }
            };
            break;
        case('m'):
        case('make'):
            commands['t'] =
            commands['template'] =
            {
                'description': global.MAKE_template_Desc,
                'invoke': function (session, args, corporalCallback) {
                    var options = cli_GetOptions([
                        {
                            name: 'file',
                            type: String,
                            defaultOption: true,
                            description: global.MAKE_template_file_Desc
                        }
                    ], args);
                    nimble.series([function (nimbleCallback) {
                        make_DoCommand('template', options, nimbleCallback);
                    }], corporalCallback);
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
function docker_DoCommand(cmd, options, callback) {
    var docker = global.require_Cache['docker-remote-api'];
    var request = docker({host: '/var/run/docker.sock'});
    switch (cmd) {
        case('ps'):
            var queryString = {all: options.all};
            request.get('/containers/json', {qs: queryString, json: true}, function (err, containers) {
                console.log(containers);
                if (callback) {
                    callback();
                }
            });
            break;
    }
}

//Make Command Handlers
function make_DoCommand(cmd, options, callback) {
    switch (cmd) {
        case('template'):
            console.log(options);
            var queryString = options;
/*            request.get('/containers/json', {qs: queryString, json: true}, function (err, containers) {
                console.log(containers);
                if (callback) {
                    callback();
                }
            });*/
            break;
    }
}

//Corporal CLI helpers
function cli_CorporalLoop(cmd, commands) {
    var Corporal = global.require_Cache['corporal'];
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
    var cliArgs = global.require_Cache['command-line-args'];
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
    var path = global.require_Cache['path'];
    var commander = global.require_Cache['commander'];
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
    }else{
        callback();
    }
}

//Uncategorized utility functions
function util_WriteJsonObjectToFileThenQuit(path, obj) {
    var jsonFile = global.require_Cache['jsonfile'];
    jsonFile.writeFileSync(path, obj);
    util_Exit(0);
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

