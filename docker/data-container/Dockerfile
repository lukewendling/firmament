FROM ubuntu:15.04

VOLUME /var/lib/mysql
VOLUME /data/db
VOLUME /var/log/sotera
VOLUME /usr/share/elasticsearch/data

RUN ["mkdir", "/downloads"]
# RUN ["chmod", "-R", "777", "/downloads"]

VOLUME /downloads

# forceful 777 in bash
COPY ./docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
