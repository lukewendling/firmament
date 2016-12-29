FROM ubuntu:15.04

VOLUME /var/lib/mysql
VOLUME /data/db
VOLUME /var/log/sotera
VOLUME /usr/share/elasticsearch/data

RUN ["mkdir", "/downloads"]
RUN ["chmod", "-R", "777", "/downloads"]

VOLUME /downloads

CMD ["/bin/bash"]
