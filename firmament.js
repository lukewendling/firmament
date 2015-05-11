#!/usr/local/node/bin/node

var configFilename = 'firmament.json';

var configFileTemplate = [
    {
        containerName: '<what would you like to name your container?>',
        imageName: '<which Docker image would you like to use to name this container?>',
        hostName: '<what would you like the hostname of your container to be?>'
    }
];

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
    "util": "^0.10.3"
};

var requireCache = {};
requireCache['fs'] = require('fs');

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

function letThereBeLight() {
    var colors = requireCache['colors'];
    var commander = requireCache['commander'];
    var doSubCommand = false;
    commander
        .version('0.0.2')
        .usage('[options] <file ...>')
        .option('-t, --template [filename]', "Create template JSON config file. Filename defaults to '" + configFilename + "'");
    commander
        .command('docker [cmd]')
        .alias('d')
        .option('-a, --all', "Show all containers, even ones that aren't running.")
        .action(function (cmd, options) {
            doSubCommand = true;
            enterDockerCmdProcessor(cmd, options);
        });
    commander.parse(process.argv);
    if (doSubCommand) {
        return;
    }
    if (!doSubCommand && commander.template) {
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
        var configFiles = commander.args || [configFilename];
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
                if(callMeBack){
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
    var docker = requireCache['docker-remote-api'];
    var request = docker({host: '/var/run/docker.sock'});
    request.get('/images/json?all=1', {json: true}, function (err, images) {
        if (err) {
            fatal(err);
        }
        console.log('hello'.green);
        console.log(images);
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

//var shell = require('shelljs');
//var result = shell.exec('docker run --detach --restart=no --name mongo --hostname mongo mongo', {silent: true});
//shell.echo(result);

