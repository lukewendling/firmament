FROM ubuntu:15.04

RUN apt-get update
RUN apt-get install -y git vim procps curl python build-essential

RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get install -y nodejs

RUN useradd -ms /bin/bash strong-pm
RUN chown -R strong-pm:strong-pm /usr/local

RUN npm install -g strong-pm && npm cache clear
RUN npm install -g strongloop && npm cache clear

# Set up some semblance of an environment
WORKDIR /home/strong-pm
ENV HOME=/home/strong-pm

# Run as non-privileged user inside container
USER strong-pm

# Expose strong-pm port
EXPOSE 8701

ENTRYPOINT ["/usr/bin/sl-pm", "--base", ".", "--listen", "8701"]

