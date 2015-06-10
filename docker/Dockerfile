FROM node:0.12.4-wheezy

RUN useradd -ms /bin/bash strong-pm \
    && chown -R strong-pm:strong-pm /usr/local \
    && su strong-pm -c "npm install -g strong-pm && npm cache clear" \
    && su strong-pm -c "npm install -g strongloop && npm cache clear"

RUN apt-get update
RUN apt-get remove -y git
RUN apt-get install -y git
RUN apt-get install -y vim
RUN apt-get install -y procps

# Set up some semblance of an environment
WORKDIR /home/strong-pm
ENV HOME=/home/strong-pm

# Run as non-privileged user inside container
USER strong-pm

# Expose strong-pm port
EXPOSE 8701

ENTRYPOINT ["/usr/local/bin/sl-pm", "--base", ".", "--listen", "8701"]

