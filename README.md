# Firmament
Perl and bash scripts to create cooperative database and web server docker containers.  
Firmament also provides a much more streamlined command line interface for interacting with docker containers.

## Installation
Pull the latest version.  
Run "./firmament.js init"  
Firmament will download all of its dependencies.  

## Dependencies
Nodejs installed under ~/usr/local/bin/node    
**NOTE** If your node install is located somewhere else you will need to modify the top line of the firmament.js file accordingly.

## Usage

**Docker Interaction shell:**  
"./firmament.js docker"  
You will see a docker prompt  
docker->>  
type help to get a list of all docker commands  

**Make Interaction Shell:**  
"./firmament.js make"  
You will see a make prompt.  
make->>  
type "help" to get a list of all make commands.  
type "template" to generate a template firmament configuration file.  
type "make build [filename]" to execute a firmament configuration file.  

## Credits
Author: John Reeme
