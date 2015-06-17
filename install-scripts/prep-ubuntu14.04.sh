#!/bin/bash
echo 'set -o vi' >> ~/.bashrc
echo "alias d='/usr/bin/docker'" >> ~/.bashrc
echo "alias f='~/firmament/firmament.js'" >> ~/.bashrc
echo 'set nu' >> ~/.vimrc
apt-get update
apt-get install -y git
apt-get install -y build-essential
wget http://nodejs.org/dist/v0.12.4/node-v0.12.4.tar.gz
tar xvf node-v0.12.4.tar.gz
wget -qO- https://get.docker.com/ | sh
cd node-v0.12.4
./configure
make
make install
rm node-v0.12.4.tar.gz
rm -rf node-v0.12.4
