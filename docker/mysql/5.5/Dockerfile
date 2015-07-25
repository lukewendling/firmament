FROM jreeme/mysql:5.5.2

RUN apt-get -y update
RUN apt-get -y install vim

COPY docker-entrypoint.sh /entrypoint.sh
COPY sotera-db-oneshot.pl /sotera-db-oneshot.pl
