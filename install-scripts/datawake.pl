#!/usr/bin/perl
#Make sure we are user 'datawake'
$_ = `whoami`;
if(!/datawake/){
	die "This script is best run as user 'datawake'.";
}
#See if we need to install docker
$which_docker = `which docker`;
if($which_docker !~ /docker/){
	print "Installing 'docker'";
	print `sudo curl -sSL https://get.docker.com/ | sh`;
}

#See if datawake is a member of group 'docker'
$datawake_user = "datawake";
$groups = `groups $datawake_user`;
if($groups !~ /docker/){
	print "Adding user 'datawake' to group 'docker'";
	print `sudo usermod -aG docker $datawake_user`;
	die "*** Please logout and log back in and re-run this script ***\n";
}
#Some code to add user 'datawake' in case we need it later
#$NEW_USER="datawake";
#print `sudo useradd -m -d /home/$NEW_USER -N -G adm,cdrom,sudo,dip,plugdev,lpadmin,sambashare,docker -s /bin/bash $NEW_USER`;
#print `sudo passwd $NEW_USER`;
$_ = `docker ps -a`;
if(!/data-container/){
	print `docker run -dt --name data-container -h data-container jreeme/data-container:7.0`;
}else{
	print `docker start data-container`;
}
if(!/mongo/){
	print `docker run -dt --volumes-from data-container --name mongo -h mongo jreeme/mongo:7.0`;
}else{
	print `docker start mongo`;
}
if(!/mysql/){
	print `docker run -dt --volumes-from data-container --name mysql -h mysql jreeme/mysql:7.0`;
}else{
	print `docker start mysql`;
}
if(!/loopback/){
	print `docker run -dt --name loopback -h loopback --link mongo:mongo --link mysql:mysql -p 8701:8701 -p 3001:3001 jreeme/loopback:7.0`;
}else{
	print `docker start loopback`;
}
if(!/webapp/){
	print `docker run -dt --name webapp -h webapp --link loopback:loopback -p 8702:8701 -p 3002:3001 jreeme/webapp:7.0`;
}else{
	print `docker start webapp`;
}
if(!/tangelo/){
	print `docker run -dt --name tangelo -h tangelo --link mysql:mysql -p 80:80 jreeme/tangelo:7.0`;
}else{
	print `docker start tangelo`;
}
