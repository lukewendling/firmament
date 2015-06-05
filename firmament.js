#!/usr/local/node/bin/node

start();

function start() {
  assignStaticGlobals();
  require_ResolveModuleDependencies(function () {
    requireCache('wait.for').launchFiber(fiberWrapper);
  });
}

function fiberWrapper() {
  util_SetupConsoleTable();
  commander_CreateCommanderCommandMap();
  util_EnterUnhandledExceptionWrapper(commander_Configure);
}

function assignStaticGlobals() {
  global.VERSION = '0.0.3';
  global.configFilename = 'firmament.json';
  global.require_Cache = {};
  global.firmamentEmitter = new (requireCache('events'))();

  global.slowToLoadModuleDependencies = {
    "dockerode": "^2.1.4",
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
    "nimble": "^0.0.2",
    "util": "^0.10.3"
  };

  global.moduleDependencies = {
    "wait.for": "^0.6.6",
    "events": "",
    "child_process": "",
    "fibers": "^1.0.5"
  };

  global.ROOT_docker_Desc = 'Issue Docker commands to local or remote Docker server';
  global.ROOT_make_Desc = 'Issue make commands to build and deploy Docker containers';
  global.DOCKER_ps_Desc = 'Show running containers';
  global.DOCKER_start_Desc = 'Start docker container (use firmament ID)';
  global.DOCKER_stop_Desc = 'Stop docker container (use firmament ID)';
  global.DOCKER_sh_Desc = 'Launch shell session in container (use firmament ID)';
  global.DOCKER_sh_ids_Desc = "Fermament ID of container to shell into";
  global.DOCKER_sh_Usage = "Docker 'sh' command usage:";
  global.DOCKER_start_ids_Desc = "Fermament IDs of containers to start";
  global.DOCKER_stop_ids_Desc = "Fermament IDs of containers to stop";
  global.DOCKER_ps_all_Desc = "Show all containers, even ones that aren't running";
  global.DOCKER_ps_Usage = "Docker 'ps' command usage:";
  global.DOCKER_start_Usage = "Docker 'start' command usage:";
  global.DOCKER_stop_Usage = "Docker 'stop' command usage:";
  global.MAKE_build_Usage = "Make 'build' command usage:";
  global.MAKE_build_Desc = "Construct container cluster from the specified filename or 'firmament.json'";
  global.MAKE_build_file_Desc = 'Name of file to read for container configurations';
  global.MAKE_template_Usage = "Make 'template' command usage:";
  global.MAKE_template_Desc = "Write a makefile template to the specified filename or 'firmament.json'";
  global.MAKE_template_full_Desc = 'Write full container descriptor (quite large)';
  global.MAKE_template_file_Desc = 'Name of file to write makefile template to';
}

function getDockerContainerConfigTemplate() {
  return [
/*    {
      name: 'ubuntu',
      Image: 'ubuntu',
      Hostname: 'ubuntu'
    },*/
    {
      name: 'mongo',
      Image: 'mongo',
      Hostname: 'mongo'
    },
    {
      name: 'strongloop',
      Image: 'strongloop/strong-pm',
      Hostname: 'strongloop',
      ExposedPorts: {
        '3001/tcp': {},
        '3002/tcp': {}
      },
      HostConfig: {
        Links: ['mongo:mongo'],
        PortBindings: {
          '3001/tcp': [{HostPort: '3001'}],
          '3002/tcp': [{HostPort: '3002'}],
          '8701/tcp': [{HostPort: '8701'}]
        }
      },
      ExpressApps: [
        {
          GitUrl: 'https://github.com/jreeme/AminoLoopBack',
          GitBranchName: 'deploy',
          StrongLoopServerUrl: 'http://localhost:8701',
          ServiceName: 'AminoLoopBack'
        },
        {
          GitUrl: 'https://github.com/jreeme/AminoWebApp',
          GitBranchName: 'deploy',
          StrongLoopServerUrl: 'http://localhost:8701',
          ServiceName: 'AminoWebApp'
        }
      ]
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
    Tty: true,
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
        .command('sh <ID>')
        .description(global.DOCKER_sh_Desc)
        .action(function (ID) {
          docker_ShellIntoContainerByFirmamentId(ID);
        });
      commander
        .command('stop <ID> [otherIDs...]')
        .description(global.DOCKER_stop_Desc)
        .action(function (ID, otherIDs) {
          var IDs = [ID];
          Array.prototype.push.apply(IDs, otherIDs);
          docker_StartOrStopContainersByFirmamentIds(IDs, false);
        });
      commander
        .command('start <ID> [otherIDs...]')
        .description(global.DOCKER_start_Desc)
        .action(function (ID, otherIDs) {
          var IDs = [ID];
          Array.prototype.push.apply(IDs, otherIDs);
          docker_StartOrStopContainersByFirmamentIds(IDs, true);
        });
      commander
        .command('ps [options]')
        .description(global.DOCKER_ps_Desc.green)
        .option('-a, --all', global.DOCKER_ps_all_Desc)
        .action(function (cmd, options) {
          var containers = docker_PS(options);
          docker_PrettyPrintDockerContainerList(containers, false, options.all);
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
          make_TEMPLATE(filename || global.configFilename, options, function (err) {
            util_Exit(err);
          });
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
  //The 'invoke' callbacks in the CLI come from the great beyond somewhere and most definitely
  //not from within a fiber so all our 'wait.for's break unless we spin up a fiber to handle them
  var wait = requireCache('wait.for');
  var commands = {};
  switch (cmd) {
    case('d'):
    case('docker'):
      commands['sh'] =
      {
        'description': global.DOCKER_sh_Desc,
        'invoke': function (session, args, corporalCallback) {
          util_CallFunctionInFiber(function (callback) {
            var optionsAndUsage = cli_GetOptionsAndUsage([
              {
                name: 'id',
                type: Number,
                defaultOption: true,
                description: global.DOCKER_sh_ids_Desc
              }
            ], args, {header: global.DOCKER_sh_Usage});
            if (optionsAndUsage.options.help) {
              console.log(optionsAndUsage.usage);
            } else {
              if (optionsAndUsage.options.id) {
                var result = docker_ShellIntoContainerByFirmamentId(optionsAndUsage.options.id);
                if(result){
                  util_LogError(result.Error);
                }
              } else {
                console.log(optionsAndUsage.usage);
              }
            }
            callback();
          }, args, corporalCallback);
        }
      };
      commands['stop'] =
      {
        'description': global.DOCKER_stop_Desc,
        'invoke': function (session, args, corporalCallback) {
          util_CallFunctionInFiber(function (callback) {
            var optionsAndUsage = cli_GetOptionsAndUsage([
              {
                name: 'ids',
                type: Array,
                alias: 'i',
                defaultOption: true,
                description: global.DOCKER_stop_ids_Desc
              }
            ], args, {header: global.DOCKER_stop_Usage});
            if (optionsAndUsage.options.help) {
              console.log(optionsAndUsage.usage);
            } else {
              if (optionsAndUsage.options.ids) {
                docker_StartOrStopContainersByFirmamentIds(optionsAndUsage.options.ids, false);
              } else {
                console.log(optionsAndUsage.usage);
              }
            }
            callback();
          }, args, corporalCallback);
        }
      };
      commands['start'] =
      {
        'description': global.DOCKER_start_Desc,
        'invoke': function (session, args, corporalCallback) {
          util_CallFunctionInFiber(function (callback) {
            var optionsAndUsage = cli_GetOptionsAndUsage([
              {
                name: 'ids',
                type: Array,
                alias: 'i',
                defaultOption: true,
                description: global.DOCKER_start_ids_Desc
              }
            ], args, {header: global.DOCKER_start_Usage});
            if (optionsAndUsage.options.help) {
              console.log(optionsAndUsage.usage);
            } else {
              if (optionsAndUsage.options.ids) {
                docker_StartOrStopContainersByFirmamentIds(optionsAndUsage.options.ids, true);
              } else {
                console.log(optionsAndUsage.usage);
              }
            }
            callback();
          }, args, corporalCallback);
        }
      };
      commands['ps'] =
      {
        'description': global.DOCKER_ps_Desc,
        'invoke': function (session, args, corporalCallback) {
          util_CallFunctionInFiber(function (callback) {
            var optionsAndUsage = cli_GetOptionsAndUsage([
              {
                name: 'all',
                type: Boolean,
                alias: 'a',
                description: global.DOCKER_ps_all_Desc
              }
            ], args, {header: global.DOCKER_ps_Usage});
            if (optionsAndUsage.options.help) {
              console.log(optionsAndUsage.usage);
            } else {
              var containers = docker_PS(optionsAndUsage.options);
              docker_PrettyPrintDockerContainerList(containers, false, optionsAndUsage.options.all);
            }
            callback();
          }, args, corporalCallback);
        }
      };
      break;
    case('m'):
    case('make'):
      commands['build'] =
      {
        'description': global.MAKE_build_Desc,
        'invoke': function (session, args, corporalCallback) {
          util_CallFunctionInFiber(function (callback) {
            var optionsAndUsage = cli_GetOptionsAndUsage([
              {
                name: 'file',
                type: String,
                defaultOption: true,
                description: global.MAKE_build_file_Desc
              }
            ], args, {header: global.MAKE_build_Usage});
            if (optionsAndUsage.options.help) {
              console.log(optionsAndUsage.usage);
            } else {
              make_BUILD(optionsAndUsage.options.file || global.configFilename);
            }
            callback();
          }, args, corporalCallback);
        }
      };
      commands['template'] =
      {
        'description': global.MAKE_template_Desc,
        'invoke': function (session, args, corporalCallback) {
          util_CallFunctionInFiber(function (callback) {
            var optionsAndUsage = cli_GetOptionsAndUsage([
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
            ], args, {header: global.MAKE_template_Usage});
            if (optionsAndUsage.options.help) {
              console.log(optionsAndUsage.usage);
              callback();
            } else {
              make_TEMPLATE(optionsAndUsage.options.file || global.configFilename, optionsAndUsage.options, function (err) {
                util_LogError(err);
                callback();
              });
            }
          }, args, corporalCallback);
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
function docker_ShellIntoContainerByFirmamentId(ID) {
  var wait = requireCache('wait.for');
  var containerName = docker_GetContainerNameByFirmamentId(ID, docker_PS({all: false}));
  if(!containerName){
    return {Error: "No container with FirmamentId: '" + ID + "'"};
  }
  var options = {
    containerName: containerName.substring(1)
  };
  try {
    return wait.for(docker_ScopePuppy, 'exec', options);
  } catch (ex) {
    return {Error: ex};
  }
}

function docker_StartOrStopContainersByFirmamentIds(IDs, start) {
  var containers = docker_PS({all: start});
  var containerNames = [];
  IDs.forEach(function (ID) {
    var containerName = docker_GetContainerNameByFirmamentId(ID, containers);
    if (containerName) {
      containerNames.push(containerName);
    }
  });
  containerNames.forEach(function (containerName) {
    console.log((start ? 'Starting' : 'Stopping') + " container: '" + containerName + "'");
    console.log(docker_StartOrStopContainer(containerName, containers, start).Message);
  });
}

function docker_PS(options) {
  var wait = requireCache('wait.for');
  return wait.for(docker_ScopePuppy, 'listContainers', {all: options.all});
}

function docker_ScopePuppy(fnName, options, callback) {
  if (!global.docker) {
    var Docker = requireCache('dockerode');
    global.docker = new Docker({socketPath: '/var/run/docker.sock'});
  }
  if (fnName === 'createContainer') {
    global.docker.createContainer(options, callback);
  } else if (fnName === 'listContainers') {
    global.docker.listContainers(options, callback);
  } else if (fnName === 'exec') {
    var child = requireCache('child_process').spawn('docker', ['exec', '-it', options.containerName, '/bin/bash'], {
      stdio: 'inherit'
    });
    child.on('exit', function (err, code) {
      callback(err, code);
    });
  } else {
    var container = global.docker.getContainer(options.id);
    if (!container.id) {
      callback({Message: 'No such container'}, null);
      return;
    } else if (fnName === 'startOrStopContainer') {
      options.start ? container.start(callback) : container.stop(callback);
    } else if (fnName === 'removeContainer') {
      container.remove(options, callback);
    }
    else {
      callback({Message: 'Unknown Docker command'}, null);
    }
  }
}

function docker_PrettyPrintDockerContainerList(containers, noprint, all) {
  console.log('');//Line feed
  if (!containers || !containers.length) {
    if (!noprint) {
      console.log('No ' + (all ? '' : 'Running ') + 'Containers\n');
    }
    return [];
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
      Name: container.Names[0],
      Image: container.Image,
      DockerId: container.Id.substring(1, 12),
      Status: container.Status
    };
    displayContainers.push(displayContainer);
  });
  if (!noprint) {
    console.table(displayContainers);
  }
  return displayContainers;
}

function docker_CreateContainer(containerConfig) {
  var deepExtend = requireCache('deep-extend');
  var wait = requireCache('wait.for');

  var fullContainerConfigCopy = {};
  deepExtend(fullContainerConfigCopy, getDockerContainerDefaultDescriptor());
  deepExtend(fullContainerConfigCopy, containerConfig);

  try {
    var result = wait.for(docker_ScopePuppy, 'createContainer', fullContainerConfigCopy);
    return {Message: "Container '" + fullContainerConfigCopy.name + "' created (Id: " + result.id.substring(1, 12) + ")"};
  } catch (ex) {
    return {Message: ex.message};
  }
}

function docker_RemoveContainer(containerName, containers) {
  var wait = requireCache('wait.for');

  var containerDockerId = docker_GetContainerDockerIdByName(containerName, containers);

  try {
    var result = wait.for(docker_ScopePuppy, 'removeContainer', {id: containerDockerId, force: 1});
    return {Message: "Container '" + containerName + "' removed (Id: " + result.id.substring(1, 12) + ")"};
  } catch (ex) {
    return {Message: ex.message};
  }
}

function docker_StartOrStopContainer(containerName, containers, start) {
  var wait = requireCache('wait.for');
  var containerDockerId = docker_GetContainerDockerIdByName(containerName, containers);
  try {
    wait.for(docker_ScopePuppy, 'startOrStopContainer', {id: containerDockerId, start: start});
    return {Message: "Container: '" + containerName + "' " + (start ? 'start' : 'stopp') + 'ed.'};
  } catch (ex) {
    return {Message: ex.message};
  }
}

function docker_GetContainerDockerIdByName(containerName, containers) {
  //Brute force is fun!
  for (var i = 0; i < containers.length; ++i) {
    for (var j = 0; j < containers[i].Names.length; ++j) {
      if (containerName === containers[i].Names[j]) {
        return containers[i].Id;
      }
    }
  }
}

function docker_GetContainerDockerIdByFirmamentId(firmamentId, containers) {
  var containerName = docker_GetContainerNameByFirmamentId(firmamentId, containers);
  return docker_GetContainerDockerIdByName(containerName, containers);
}

function docker_GetContainerNameByFirmamentId(firmamentId, containers) {
  var displayContainers = docker_PrettyPrintDockerContainerList(containers, true);
  for (var i = 0; i < displayContainers.length; ++i) {
    if (displayContainers[i].ID == firmamentId) {
      return displayContainers[i].Name;
    }
  }
}

//Make Command Handlers
function make_ProcessContainerConfigs(containerConfigs) {
  var sortedContainerConfigs = util_ContainerDependencySort(containerConfigs);
  var wait = requireCache('wait.for');

  wait.parallel.filter(sortedContainerConfigs, function (containerConfig) {
    console.log("Removing old Docker container: '" + containerConfig.name + "'");
    var result = docker_RemoveContainer('/' + containerConfig.name, docker_PS({all: true}));
    console.log(result.Message);
  });

  wait.parallel.filter(sortedContainerConfigs, function (containerConfig) {
    console.log("Creating Docker container: '" + containerConfig.name + "'");
    var result = docker_CreateContainer(containerConfig);
    console.log(result.Message);
  });

  var containers = docker_PS({all: true});
  docker_PrettyPrintDockerContainerList(containers, false, true);

  //Start the containers
  sortedContainerConfigs.forEach(function (containerConfig) {
    console.log(docker_StartOrStopContainer('/' + containerConfig.name, containers, true).Message);
  });

  docker_PrettyPrintDockerContainerList(docker_PS({all: false}), false, false);

  //Deploy the Express applications
  sortedContainerConfigs.forEach(function (containerConfig) {
    if (!containerConfig.ExpressApps) {
      return;
    }

    containerConfig.ExpressApps.forEach(function (expressApp) {
      expressApp.GitCloneFolder = process.cwd() + '/' + expressApp.ServiceName + (new Date()).getTime();
      wait.for(make_GitClone, expressApp.GitUrl, expressApp.GitCloneFolder);
    });

    containerConfig.ExpressApps.forEach(function (expressApp) {
      var argv = ['--scripts'];
      argv.unshift(process.argv[1]);
      argv.unshift(process.argv[0]);
      wait.for(make_StrongBuild, argv, expressApp.GitCloneFolder);
    });

    containerConfig.ExpressApps.forEach(function (expressApp) {
      var strongLoopServerUrl = expressApp.StrongLoopServerUrl || 'http://localhost:8701';
      var url = requireCache('url');
      var path = requireCache('path');
      var serviceName = expressApp.ServiceName || path.basename(url.parse(expressApp.GitUrl).path);
      var gitBranchName = expressApp.GitBranchName || 'deploy';
      wait.for(make_StrongDeploy, expressApp.GitCloneFolder, strongLoopServerUrl, serviceName, gitBranchName);
    });
  });
}

function make_GitClone(gitUrl, localFolder, callback) {
  var nodeGit = requireCache('nodegit');
  nodeGit.Clone(gitUrl, localFolder)
    .then(function (repo) {
      console.log("git clone: '" + gitUrl + "' -> '" + localFolder + "'");
      callback(null, null);
    });
}

function make_StrongBuild(argv, gitCloneFolder, callback) {
  var strongBuild = requireCache('strong-build');
  process.chdir(gitCloneFolder);
  strongBuild.build(argv, function () {
    console.log("strong-build:  -> '" + gitCloneFolder + "'");
    callback(null, null);
  });
}

function make_StrongDeploy(cwd, strongLoopServerUrl, serviceName, gitBranchName) {
  var strongDeploy = requireCache('strong-deploy');
  var wait = requireCache('wait.for');
  return wait.for(strongDeploy, cwd, strongLoopServerUrl, serviceName, gitBranchName);
}

function make_BUILD(filename, options, callback) {
  var jsonFile = requireCache('jsonfile');
  console.log("Constructing Docker containers described in: '" + filename + "'");
  var containerDescriptors = jsonFile.readFileSync(filename);
  console.log(containerDescriptors);
  make_ProcessContainerConfigs(containerDescriptors);
  if (callback) {
    callback();
  }
}

function make_TEMPLATE(filename, options, callback) {
  console.log("\nCreating JSON template file '" + filename + "' ...");
  var fs = requireCache('fs');
  if (fs.existsSync(filename)) {
    var yesno = requireCache('yesno');
    yesno.ask("Config file '" + filename + "' already exists. Overwrite? [Y/n]", true, function (ok) {
      if (ok) {
        util_WriteTemplateFile(filename, options.full, callback);
      } else {
        callback({Message: 'Canceled'});
      }
    });
  } else {
    util_WriteTemplateFile(filename, options.full, callback);
  }
}

//Corporal CLI helpers
function cli_CorporalLoop(cmd, commands) {
  var Corporal = requireCache('corporal');
  var corporal = new Corporal({
    'commands': commands,
    'env': {
      'ps1': global.commandAlias[cmd].yellow + '->> ',
      'ps2': '>> '
    }
  });
  corporal.on('load', corporal.loop);
}

function cli_GetOptionsAndUsage(argArray, args, usageConfig) {
  usageConfig = usageConfig || {};
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
  var usage = cli.getUsage(usageConfig);
  return {options: options, usage: usage};
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

  console.log("Looking for '" + moduleName + "' in dependency list ...")
  var version = global.slowToLoadModuleDependencies[moduleName];
  var modulesToDownload = [version && version.length ? moduleName + '@' + version : moduleName];

  requireCache('wait.for').for(require_NpmInstall, modulesToDownload);

  return global.require_Cache[moduleName] = require(moduleName);
}

function require_NpmInstall(modulesToDownload, callback) {
  if (!modulesToDownload || !modulesToDownload.length) {
    callback({Message: 'require_NpmInstall() called with no modules to install'});
  }
  var npm = global.require_Cache['npm'];
  if (!npm) {
    var childProcess = requireCache('child_process');
    var childProcessOutput = childProcess.execSync('npm root -g', {encoding: 'utf8', stdio: 'pipe'});
    childProcessOutput = childProcessOutput.replace(/\n$/, '');
    npm = global.require_Cache['npm'] = require(childProcessOutput + '/npm');
    npm.load({loaded: false}, function (err) {
      if (err) {
        util_Fatal(err);
      }
      require_InstallNodeModules(npm, modulesToDownload, callback);
    });
  } else {
    require_InstallNodeModules(npm, modulesToDownload, callback);
  }
}

function require_InstallNodeModules(npm, modulesToDownload, callback) {
  npm.commands.install(modulesToDownload, function (err, data) {
    if (err) {
      util_Fatal(err);
    }
    console.log(data);
    callback(err, data);
  });
}

function require_ResolveModuleDependencies(callback) {
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
    console.log("\nI'll try to find what we're missing (could take a couple of minutes) ...\n");
    console.log(modulesToDownload);

    var childProcess = require('child_process');
    var childProcessOutput = childProcess.execSync('npm root -g', {encoding: 'utf8', stdio: 'pipe'});

    childProcessOutput = childProcessOutput.replace(/\n$/, '');
    var npm = require(childProcessOutput + '/npm');
    npm.load({loaded: false}, function (err) {
      if (err) {
        util_Fatal(err);
      }
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
    });
  } else {
    callback();
  }
}

//Uncategorized utility functions
function util_WriteJsonObjectToFile(path, obj, callback) {
  var jsonFile = requireCache('jsonfile');
  jsonFile.spaces = 2;
  jsonFile.writeFile(path, obj, callback);
}

function util_ContainerDependencySort(containerConfigs) {
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

function util_Exit(err, code) {
  util_LogError(err);
  process.exit(err ? code || -1 : code);
}

function util_Fatal(ex) {
  console.log("\nMan, sorry. Something bad happened and I can't continue. :(");
  console.log("\nHere's all I know:\n");
  util_Exit(ex);
}

function util_LogError(err) {
  if (err) {
    console.log(err);
    console.log('');
    return true;
  }
  return false;
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

function util_WriteTemplateFile(templateFilename, full, callback) {
  var objectToWrite = full ? [getDockerContainerDefaultDescriptor()] : getDockerContainerConfigTemplate()
  util_WriteJsonObjectToFile(templateFilename, objectToWrite, callback);
}

function util_CallFunctionInFiber(fn, args, callback) {
  var wait = requireCache('wait.for');
  var eventName = ((new Date()).getTime()).toString();
  global.firmamentEmitter.once(eventName, function (args, callback) {
    wait.launchFiber(function (args, callback) {
      try {
        fn(callback);
      } catch (err) {
        util_LogError(err);
      }
    }, args, callback);
  }).emit(eventName, args, callback);
}

function util_Int32FromBytes(x) {
  var val = 0;
  for (var i = 0; i < x.length; ++i) {
    val += x[i];
    if (i < x.length - 1) {
      val = val << 8;
    }
  }
  return val;
}

/**Parameters:
 data - string, every `bytes` bytes will form one number entry
 array - the output array refference where numbers will be put
 bytes - number of bytes per entry
 big_endian - use big endian? (little endian otherwise)
 */
function fromBytes(data, array, bytes, big_endian) {
  //Temporary variable for current number
  var num;
  //Loop through byte array
  for (var i = 0, l = data.length; i < l; i += bytes) {
    num = 0;
    //Jump through the `bytes` and add them to number
    if (big_endian) {
      for (var b = 0; b < bytes; b++) {
        num += (num << 8) + data[i + b];
      }
    }
    else {
      for (var b = bytes - 1; b >= 0; b--) {
        num += (num << 8) + data[i + b];
      }
    }
    //Add decomposed number to an array
    array.push(num);
  }
  return array;
}
