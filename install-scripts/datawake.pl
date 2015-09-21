#!/usr/bin/perl
#$which_docker = `which docker`;
#if($which_docker !~ /docker/){
#	print `sudo curl -sSL https://get.docker.com/ | sh`;
#}
#$NEW_USER="datawake";
#print `sudo useradd -m -d /home/$NEW_USER -N -G adm,cdrom,sudo,dip,plugdev,lpadmin,sambashare,docker -s /bin/bash $NEW_USER`;
#print `sudo passwd $NEW_USER`;

usermod -aG docker datawake

print `docker run -dt --name data-container -h data-container jreeme/data-container:7.0`;
print `docker run -dt --volumes-from data-container --name mongo -h mongo jreeme/mongo:7.0`;
print `docker run -dt --volumes-from data-container --name mysql -h mysql jreeme/mysql:7.0`;
print `docker run -dt --name loopback -h loopback --link mongo:mongo --link mysql:mysql -p 8701:8701 -p 3001:3001 jreeme/loopback:7.0`;
print `docker run -dt --name webapp -h webapp --link loopback:loopback -p 8702:8701 -p 3002:3001 jreeme/webapp:7.0`;
print `docker run -dt --name tangelo -h tangelo --link mysql:mysql -p 80:80 jreeme/tangelo:7.0`;
