FROM node:20-trixie-slim

ENV CI=1 \
    npm_config_update_notifier=false \
    PATH=/workspace/node_modules/.bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        jq \
        less \
        openssh-client \
        procps \
        python3 \
        make \
        g++ \
        ripgrep \
        zsh \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && groupadd --gid 1000 sandbox \
    && useradd --uid 1000 --gid sandbox --create-home --shell /usr/bin/zsh sandbox \
    && mkdir -p /workspace \
    && chown sandbox:sandbox /workspace \
    && git config --system --add safe.directory /workspace

WORKDIR /workspace

USER sandbox

CMD ["tail", "-f", "/dev/null"]