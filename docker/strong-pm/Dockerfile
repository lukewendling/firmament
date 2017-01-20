FROM ubuntu:16.04

ENV TERM=xterm

RUN apt-get update && apt-get install -y \
  git vim procps curl python build-essential libkrb5-dev

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

RUN useradd -ms /bin/bash strong-pm
#RUN chown -R strong-pm:strong-pm /usr/local

RUN npm install -g --unsafe-perm strong-pm@5.0.1 strongloop@6.0.3 && npm cache clear

# Set up some semblance of an environment
WORKDIR /home/strong-pm
ENV HOME=/home/strong-pm

# Run as non-privileged user inside container
#USER strong-pm

# Expose strong-pm port
EXPOSE 8701

ENTRYPOINT ["/usr/bin/sl-pm", "--base", ".", "--listen", "8701"]
