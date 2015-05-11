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
    "shelljs": "^0.4.0",
    "jsonfile": "^2.0.0",
    "colors": "^1.1.0",
    "yesno": "^0.0.1",
    "util": "^0.10.3"
};

var modulesToDownload = [];

for (var key in moduleDependencies) {
    try {
        require(key);
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
                    fatal(ex);
                }
                console.log(data);
                safeLetThereBeLight();
            });
        }
    });
} else {
    safeLetThereBeLight();
}

function letThereBeLight() {
    var colors = require('colors');
    var shell = require('shelljs');
    var cliArgs = require('command-line-args');
    var cli = cliArgs([
        {name: 'help', alias: 'h', type: Boolean, description: 'Print usage instructions'},
        {name: 'template', alias: 't', type: String, description: 'Create template control JSON file'},
        {name: 'files', type: Array, defaultOption: true, description: 'One or more JSON config files'}
    ]);
    var header = 'Firmament is a script to construct and control linked docker containers described in one or more';
    header += ' JSON configuration files.';
    var usage = cli.getUsage({
        title: 'Firmament v.0.0.2 (08-MAY-2015)'.green,
        header: header.green,
        forms: ['firmament [arguments] [file1 file2 file3 ...]'],
        footer: '\n  > "Divide The Waters, Let There Be Light"'.yellow
    });
    var options = cli.parse();
    if (options.template !== undefined) {
        //User has specified '-t'
        var templateFilename = options.template ? options.template : configFilename;
        console.log("\nCreating JSON template file '" + templateFilename + "' ...");
        var fs = require('fs');
        if (fs.existsSync(templateFilename)) {
            var yesno = require('yesno');
            yesno.ask("Config file '" + templateFilename + "' already exists. Overwrite?", true, function (ok) {
                if (ok) {
                    writeJsonObjectToFileThenQuit(templateFilename, configFileTemplate);
                } else {
                    exit(0);
                }
            });
        } else {
            writeJsonObjectToFileThenQuit(templateFilename, configFileTemplate);
        }
    } else if (options.help) {
        showUsageThenQuit(usage);
    } else {
        var jsonFile = require('jsonfile');
        //Let's try to set things up according to config files
        var configFiles = options.files || [configFilename];
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

function processContainerConfigs(containerConfigs) {
    var docker = require('docker-remote-api');
    var request = docker({host: '/var/run/docker.sock'});
    request.get('/images/json', {json: true}, function (err, images) {
        if (err) {
            fatal(err);
        }
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

function showUsageThenQuit(usage) {
    console.log(usage);
    exit(0);
}

function writeJsonObjectToFileThenQuit(path, obj) {
    var jsonFile = require('jsonfile');
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

