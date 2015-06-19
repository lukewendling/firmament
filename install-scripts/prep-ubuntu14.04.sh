#!/bin/bash
update-alterantives --config editor
echo 'set -o vi' >> ~/.bashrc
echo "alias d='/usr/bin/docker'" >> ~/.bashrc
echo "alias f='~/firmament/firmament.js'" >> ~/.bashrc
echo 'set nu' >> ~/.vimrc
apt-get update
apt-get install -y git
git config --global user.email "user@nowhere.com"
git config --global user.name "user nowhere"
apt-get install -y build-essential
wget http://nodejs.org/dist/v0.11.16/node-v0.11.16.tar.gz
tar xvf node-v0.11.16.tar.gz
wget -qO- https://get.docker.com/ | sh
cd node-v0.11.16
./configure
make
make install
cd ..
rm node-v0.11.16.tar.gz
rm -rf node-v0.11.16
cd ~
git clone https://github.com/jreeme/firmament
exit
