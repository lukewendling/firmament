#!/usr/local/node/bin/node

var configFilename = 'firmament.json';

var moduleDependencies = {
    "docker-remote-api": "^4.4.1",
    "command-line-args": "^0.5.9",
    "commander": "^2.8.1",
    "check-types": "^3.2.0",
    "jsonfile": "^2.0.0",
    "colors": "^1.1.0",
    "prompt-sync": "^1.0.0",
    "single-line-log": "^0.4.1",
    "yesno": "^0.0.1",
    "nimble": "^0.0.2",
    "deep-extend": "^0.4.0",
    //"strong-deploy": "^2.2.0",
    //"strong-build": "^2.0.0",
    "util": "^0.10.3"
};

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

function rootCommander(commander) {
    commander
        .version('0.0.2')
        .usage('[options] [command]'.yellow)
}

function makeCommander(commander) {
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

function dockerCommander(commander) {
    commander
        .command('ps')
        .description('Show running containers'.green)
        .option('-a, --all', "Show all containers, even ones that aren't running")
        .action(function (cmd, options) {
            enterDockerCmdProcessor(cmd, options);
        });
}

function configureCommander() {
    var colors = requireCache['colors'];
    var path = requireCache['path'];
    var commander = requireCache['commander'];
    var nodePath = process.argv[0];
    var scriptPath = process.argv[1];
    var cmdArray = process.argv.slice(2);

    testCommandLineArgs(cmdArray);

    commander._name = path.basename(scriptPath,'.js');
    //First are is not a switch
    if (!/^-+/.test(cmdArray[0])) {
        switch(cmdArray.shift()){
            case('make'):
                commander._name += ' make';
                makeCommander(commander);
                break;
            case('docker'):
                commander._name += ' docker';
                dockerCommander(commander);
                break;
            default:
                rootCommander(commander);
                commander.outputHelp();
                break;
        }
        cmdArray.unshift(scriptPath);
        cmdArray.unshift(nodePath);
        commander.parse(cmdArray);
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

function enterDockerCmdProcessor(cmd, options) {
    var prompt = requireCache['prompt-sync'];
    var log = requireCache['single-line-log'].stdout;

    if (!cmd) {
        log('docker>> '.green);
        cmds = prompt();
        if (cmds.indexOf('exit') > -1) {
            return;
        }
        var cmds = cmds.match(/\S+/g);
        var cliArgs = requireCache['command-line-args'];
        var cli = cliArgs([{name: 'all', type: Boolean, alias: 'a'}])
        cmd = cmds[0];
        options = cli.parse(cmds);
        options.callMeBack = true;
    }
    switch (cmd) {
        case('ps'):
            dockerListContainers(options, function (err, containers, callMeBack) {
                console.log(containers);
                if (callMeBack) {
                    enterDockerCmdProcessor();
                }
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
        cb(err, containers, options.callMeBack);
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

