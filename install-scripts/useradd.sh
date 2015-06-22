#!/bin/bash
NEW_USER="dev"
useradd -m -d /home/$NEW_USER -G adm,cdrom,sudo,dip,plugdev,lpadmin,sambashare,docker -s /bin/bash -U $NEW_USER
passwd $NEW_USER
