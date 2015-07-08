FROM jreeme/tangelo:0.9

RUN mkdir /tmp/src && cd /tmp/src && git clone https://github.com/sotera/Datawake
RUN cd /usr/local/share/tangelo/web && rm -rf *
RUN cd /usr/local/share/tangelo/web && cp -R /tmp/src/Datawake/server/datawake/ .
RUN cd /usr/local/share/tangelo/web && cp -R /tmp/src/Datawake/server/forensic/ .
RUN cd /tmp/src && rm -rf *

ENV DW_DB memex_sotera
ENV DW_DB_USER root
ENV DW_DB_PASSWORD root
ENV DW_MOCK_AUTH 1
ENV DW_MOCK_FORENSIC_AUTH 1
ENV DW_CONN_TYPE mysql
ENV DW_EXTERNAL_LINK_NAMES "foo,bar"
ENV DW_EXTERNAL_LINK_VALUES "http://www.foo.gov/query?type=$ATTR$value=$VALUE,http://www.bar/$ATTR/$VALUE"
ENV FORENSIC_ES_URL "els.istresearch.com:9200"
ENV FORENSIC_ES_INDEX "memex_ht"
ENV FORENSIC_ES_CRED "memex:j9fd0LK8.a6olH24U7X81"
ENV FORENSIC_ES_MRPN 10

COPY tangelo.conf /etc/tangelo.conf
