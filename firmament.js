#!/usr/local/node/bin/node

var configFilename = 'firmament.json';

var moduleDependencies = {
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

var commanderByCommandMap = {
    root: function (commander) {
        commander
            .version('0.0.2')
        commander
            .command('docker')
    },
    docker: function (commander) {
        commander
            .command('ps [options]')
            .description('Show running containers'.green)
            .option('-a, --all', "Show all containers, even ones that aren't running")
            .action(function (dummy, options) {
                doDockerCommand('ps', options);
            });
    },
    make: function (commander) {
        commander
            .command('make [files...]')
            .alias('m')
            .description("Interpret specified config file(s) or 'firmament.json'".green)
            .option('-t, --template [filename]', "Create template config file. Filename default '" + configFilename + "'")
            .action(function (cmd, options) {
                enterMakeCmdProcessor(cmd, options);
            }).on('--help', function () {
                console.log();
                console.log('   > ps');
            });
    }
};

var commanderByAliasMap = {};
for (var command in commanderByCommandMap) {
    commanderByAliasMap[command.charAt(0)] = command;
}

var configFileTemplate = [
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

var containerFullConfig = {
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

var requireCache = {};
requireCache['fs'] = require('fs');
requireCache['path'] = require('path');

var modulesToDownload = [];

for (var key in moduleDependencies) {
    try {
        requireCache[key] = require(key);
    } catch (ex) {
        if (ex.code !== 'MODULE_NOT_FOUND') {
            fatal(ex);
        }
        modulesToDownload.push(key + '@' + moduleDependencies[key]);
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
                    fatal(err);
                }
                console.log(data);
                for (var key in moduleDependencies) {
                    requireCache[key] = requireCache[key] || require(key);
                }
                safeLetThereBeLight();
            });
        }
    });
} else {
    safeLetThereBeLight();
}

function testCommandLineArgs(args) {
    //Here we just make sure switches are contiguous (not broken up by args)
    var argsCopy = args.slice(0);
    var seenOptions = false;
    var seenArgs = false;
    while (argsCopy.length) {
        var arg = argsCopy.shift();
        if (/^-+/.test(arg)) {
            if (seenArgs && seenOptions) {
                fatal({Message: 'Poorly formed command'})
            }
            seenOptions = true;
        } else {
            seenArgs = seenOptions;
        }
    }
}

function loadRootCommander(commander) {
    commanderByCommandMap['root'](commander);
    commander.parse(process.argv);
}

function outputTopLevelHelp(commander) {
    loadRootCommander(commander);
    commander.help();
}

function configureCommander() {
    var path = requireCache['path'];
    var commander = requireCache['commander'];
    var nodePath = process.argv[0];
    var scriptPath = process.argv[1];
    var cmdArray = process.argv.slice(2);

    testCommandLineArgs(cmdArray);

    switch (cmdArray.length) {
        case(0):
            //$ firmament with no arguments
            outputTopLevelHelp(commander);
            break;
        case(1):
            if (/^-+/.test(cmdArray[0])) {
                //It's a switch
                loadRootCommander(commander);
            } else {
                //It's a standalone command (no switches or sub-commands)
                cmdArray[0] = commanderByAliasMap[cmdArray[0]] ? commanderByAliasMap[cmdArray[0]] : cmdArray[0];
                if (enterCommandLineInterpreter(cmdArray[0])) {
                    //It's a command we've never heard of
                    outputTopLevelHelp(commander);
                }
            }
            break;
        default:
            //It's some arbitrary command line we need to do one-shot
            cmdArray[0] = commanderByAliasMap[cmdArray[0]] ? commanderByAliasMap[cmdArray[0]] : cmdArray[0];
            var commanderConfig = commanderByCommandMap[cmdArray[0]];
            if (!commanderConfig) {
                outputTopLevelHelp(commander);
            }
            commander._name = path.basename(scriptPath, '.js');
            commander._name += ' ' + cmdArray[0];
            commanderConfig(commander);
            cmdArray.unshift(nodePath);
            commander.parse(cmdArray);
            break;
    }
}

function letThereBeLight() {
    configureCommander();
    return;
    var doSubCommand = false;
    if (doSubCommand) {
        return;
    }
    if (commander.template) {
        //User has specified '-t'
        var checkType = requireCache['check-types'];
        var templateFilename = checkType.string(commander.template) ? commander.template : configFilename;
        console.log("\nCreating JSON template file '" + templateFilename + "' ...");
        var fs = requireCache['fs'];
        if (fs.existsSync(templateFilename)) {
            var yesno = requireCache['yesno'];
            yesno.ask("Config file '" + templateFilename + "' already exists. Overwrite? [Y/n]", true, function (ok) {
                if (ok) {
                    writeJsonObjectToFileThenQuit(templateFilename, configFileTemplate);
                } else {
                    exit(0);
                }
            });
        } else {
            writeJsonObjectToFileThenQuit(templateFilename, configFileTemplate);
        }
    } else {
        var jsonFile = requireCache['jsonfile'];
        //Let's try to set things up according to config files
        var configFiles = commander.args.length ? commander.args : [configFilename];
        var containerConfigs = [];
        configFiles.forEach(function (configFile) {
            try {
                Array.prototype.push.apply(containerConfigs, jsonFile.readFileSync(configFile));
            }
            catch (ex) {
                fatal(ex);
            }
        });
        processContainerConfigs(containerConfigs);
    }
}

function enterCommandLineInterpreter(cmd) {
    var nimble = requireCache['nimble'];
    var commands = {};
    switch (cmd) {
        case('docker'):
            commands['ps'] =
            {
                'description': 'Show running containers',
                'invoke': function (session, args, cb) {
                    var options = getCLIOptions([
                        {
                            name: 'all',
                            type: Boolean,
                            alias: 'a',
                            description: "Show all containers, even ones that aren't running"
                        }
                    ], args);
                    if (options) {
                        nimble.series([function (nimbleCallback) {
                            dockerListContainers({all: options.all}, function (err, containers) {
                                console.log(containers);
                                nimbleCallback();
                            });
                        }], cb);
                    } else {
                        cb();
                    }
                }
            };
            break;
        default:
            //Indicate to caller this is an unknown command
            return -1;
    }
    enterCorporalCLILoop(cmd, commands);
    return 0;
}

function getCLIOptions(argArray, args) {
    var cliArgs = requireCache['command-line-args'];
    var lclArgArray = [
        {
            name: 'help',
            type: Boolean,
            alias: 'h',
            description: 'Show usage instructions'
        }
    ];
    Array.prototype.push.apply(lclArgArray, argArray);
    var cli = cliArgs(lclArgArray);
    var options = cli.parse(args);
    if (options.help) {
        console.log(cli.getUsage());
        return null;
    }
    return options;
}

function enterCorporalCLILoop(cmd, commands) {
    var Corporal = requireCache['corporal'];
    var corporal = new Corporal({
        'commands': commands,
        'env': {
            'ps1': cmd.green + '->> '.green,
            'ps2': '>> '.green
        }
    });
    corporal.on('load', corporal.loop);
}

function doDockerCommand(cmd, options) {
    switch(cmd){
        case('ps'):
            dockerListContainers(options, function(err, containers){
                console.log(containers);
            });
            break;
    }
}

function dockerListContainers(options, cb) {
    var docker = requireCache['docker-remote-api'];
    var request = docker({host: '/var/run/docker.sock'});
    var colors = requireCache['colors'];
    var queryString = {all: options.all};
    request.get('/containers/json', {qs: queryString, json: true}, function (err, containers) {
        cb(err, containers);
    });
}

function processContainerConfigs(containerConfigs) {
    var deepExtend = requireCache['deep-extend'];
    var docker = requireCache['docker-remote-api'];
    var request = docker({host: '/var/run/docker.sock'});
    var sortedContainerConfigs = dependencySort(containerConfigs);
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
    var nimble = requireCache['nimble'];
    var containers = [];
    nimble.series([
        function (callback) {
            nimble.parallel(functionArray, function () {
                callback();
            });
        },
        function (callback) {
            dockerListContainers({all: true}, function (err, res) {
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
    dockerListContainers({all: true}, function (err, containers) {
        var testName = '/' + containerConfig.name;
        for (var i = 0; i < containers.length; ++i) {
            var container = containers[i];
            for (var j = 0; j < container.Names.length; ++j) {
                var name = container.Names[j];
                if (testName === name) {
                    var docker = requireCache['docker-remote-api'];
                    var request = docker({host: '/var/run/docker.sock'});

                    var restCmd = '/containers/' + container.Id + '/start';
                    request.post(restCmd, function (err, result) {
                        if (err) {
                            fatal(err);
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

function safeLetThereBeLight() {
    try {
        letThereBeLight();
    } catch (ex) {
        fatal(ex);
    }
}

function writeJsonObjectToFileThenQuit(path, obj) {
    var jsonFile = requireCache['jsonfile'];
    jsonFile.writeFileSync(path, obj);
    exit(0);
}

function dependencySort(containerConfigs) {
    var sortedContainerConfigs = [];
    //Sort on linked container dependencies
    var objectToSort = {};
    var containerConfigByNameMap = {};
    containerConfigs.forEach(function (containerConfig) {
        if (containerConfigByNameMap[containerConfig.name]) {
            fatal({Message: 'Same name is used by more than one container.'})
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
    var sortedContainerNames = topologicalDependencySort(objectToSort);
    sortedContainerNames.forEach(function (sortedContainerName) {
        sortedContainerConfigs.push(containerConfigByNameMap[sortedContainerName]);
    });
    return sortedContainerConfigs;
}

function topologicalDependencySort(graph) {
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
                    fatal({Message: 'Circular dependency "' + dep + '" is required by "' + name + '": ' + ancestors.join(' -> ')});
                }

                visit(dep, ancestors.slice(0)); // recursive call
            });

            sorted.push(name);
        });
    } catch (ex) {
        fatal({Message: 'Linked container dependency sort failed. You are probably trying to link to an unknown container.'});
    }
    return sorted;
}

function fatal(ex) {
    console.log("\nMan, sorry. Something bad happened and I can't continue. :(".yellow)
    console.log("\nHere's all I know:\n".yellow);
    console.log(ex);
    console.log('\n');
    exit(1);
}

function exit(code) {
    process.exit(code);
}

