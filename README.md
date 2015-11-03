# Firmament
Perl and bash scripts to create cooperative database and web server docker containers.  
Firmament also provides a much more streamlined command line interface for interacting with docker containers.

## Installation
Pull the latest version.  
Run "./firmament.js init"  
Firmament will download all of its dependencies.  

## Install-Scripts
There is a folder named "install-scripts".  Inside of that folder there are some useful scripts to deal with setting up a ubuntu image.  
One in particular, "useradd.sh" contains all of the requisite groups that a user might need to run firmament docker containers.  

## "_docker-cleanup-volumes.sh"  
This script will clean up after docker as it eats up disk space.  If you find yourself running low on disk space, docker is probably to blame and this script will fix that.

## Dependencies
Nodejs installed under ~/usr/local/bin/node    
**NOTE** If your node install is located somewhere else you will need to modify the top line of the firmament.js file accordingly.

## Usage

**Make Interaction Shell:**  
"./firmament.js make"  
You will see a make prompt.  
make->>  
type "help" to get a list of all make commands.  
type "template" to generate a template firmament configuration file.  
type "make build [filename]" to execute a firmament configuration file.  

**Docker Interaction Shell:**  
"./firmament.js docker"  
You will see a docker prompt  
docker->>  
type help to get a list of all docker commands  



## Config File
The config file is basically just a json array filled with docker container config objects.  
Each config object will create and start a docker container.  

```
[{
     "name": "StrongloopWebApp",
     "Image": "jreeme/strongloop:10",
     "DockerFilePath": "docker/strong-pm",
     "Hostname": "webapp",
     "ExposedPorts": {
       "3001/tcp": {}
     },
     "HostConfig": {
       "VolumesFrom": [
         "data-container"
       ],
       "PortBindings": {
         "3001/tcp": [
           {
             "HostPort": "3002"
           }
         ],
         "8701/tcp": [
           {
             "HostPort": "8702"
           }
         ]
       }
     },
     "ExpressApps": [
       {
         "GitUrl": "https://github.com/User/Project",
         "GitSrcBranchName": "master",
         "StrongLoopBranchName": "deploy",
         "StrongLoopServerUrl": "http://localhost:8702",
         "ServiceName": "MyService",
         "Scripts": [
           {
             "RelativeWorkingDir": "./public",
             "Command": "bower",
             "Args": [
               "install",
               "--config.interactive=false"
             ]
           }
         ]
       }
     ]
   }]
```

**NOTE** Firmament will run "npm install --ignore_scripts" so any npm scripts in your package.json file need to placed under the scripts section of the appropriate docker config object (see above). 

## Credits
Author: John Reeme  
Moral Support: Justin Lueders, Mike Frame 