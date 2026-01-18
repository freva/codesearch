# Code search

Extends [github.com/google/codesearch](https://github.com/google/codesearch) with a tool to sync git repositories
to be indexed and a web interface. The sync tool and web interface inspired by [github.com/hakonhall/codesearch](https://github.com/hakonhall/codesearch).

## Configuration

Configuration is done via a config file. The format is as follows:

- The file consists of global settings and one or more `[server NAME]` sections.
- Relative paths are resolved relative to the config file location.

**Global settings:**
- `code`: Directory for checked-out and indexed source code. Default: `[workdir]/code`
- `fileindex`: Path to the file index file. Default: `[workdir]/csearch.fileindex`
- `index`: Path to the code index file. Default: `[workdir]/csearch.index`
- `port`: Port for the server. Default: `80`
- `manifest`: Path to the manifest file. Default: `[workdir]/manifest.json`
- `webdir`: Path to static web assets served by the server. Required.
- `workdir`: Working directory managed by the program. Required.

**Server section (`[server NAME]`):**
- `api`: GitHub REST API URL. Default: `https://api.github.com`
- `exclude`: Regex to exclude repositories (at most one).
- `include`: Repository or owner to include. Formats:
    - `OWNER` (all repos for user/org)
    - `OWNER/REPO` (specific repo)
    - `OWNER/REPO#BRANCH` (specific branch)
    - `OWNER/REPO#REF` (specific commit)
- `token`: OAuth2 token (e.g., personal access token).
- `weburl`: Git web interface URL. Default: `https://github.com`
- `url`: Base URL for cloning (e.g., `git@github.com`, `https://github.com`). Required.

**Example config:**
```ini
[global]
code = db
index = /home/user/.csearchindex
port = 8080
webdir = cmd/cserver/static

[server github]
exclude = ^DEPRECATED
include = freva
include = torvalds/linux  
token = ghp_XXXXXXXXXXXXXXXXXXXX
url = git@github.com

[server internal]
api = https://git.example.com/api
include = internalorg
token = ghp_YYYYYYYYYYYYYYYYYYYY
weburl = https://git.example.com
url = https://ghp_YYYYYYYYYYYYYYYYYYYY@git.example.com
```

## Binaries

The following binaries are produced:
- `cgrep`: Command-line code search using the index. Usage:
  ```sh
  cgrep [flags] regexp [file...]
  ```
  Flags: `-c` (count), `-h` (no filename), `-i` (case-insensitive), `-l` (list files), `-n` (line numbers), `-v` (invert match)

- `cindex`: Builds the code search index. Usage:
  ```sh
  cindex [flags] [path...]
  ```
  Flags: `-index` (index file), `-list` (list indexed paths), `-reset` (discard existing index), `-zip` (index zip files)

- `csearch`: Behaves like `cgrep`, but over all indexed files with option to limit search to files matching a regex. Usage:
  ```sh
  csearch [flags] regexp
  ```
  Flags: `-c` (count), `-f` (file regexp), `-h` (no filename), `-i` (case-insensitive), `-l` (list files), `-n` (line numbers), `-index` (index file)

- `cserver`: HTTP server providing the web UI. Usage:
  ```sh
  cserver --config path/to/config
  ```
- `csupdater`: Updates repositories and indices from remote sources. Usage:
  ```sh
  csupdater --config path/to/config [--manifest] [--sync] [--index] [--verbose] [--exit-early] [--help-config]
  ```
  Flags: `--config` (config file), `--exit-early` (exit without updating index if no change in sync), `--manifest` (whether to update manifest), `--sync` (whether to sync repositories), `--index` (whether to update index)
  By default, runs all update steps.

## Building

Requirements: [Go](https://golang.org/doc/install) (>=1.23), [pnpm](https://pnpm.io/) (>=10).

Run:
```sh
make
```
This installs Go binaries and builds the frontend UI.

## Automatic Updates and Server

To run the server and keep the index up to date automatically, install the provided systemd user services:

1. Copy the service files from `systemd/` to your user systemd directory:
   ```sh
   cp systemd/codesearch-server.service systemd/codesearch-updater.service ~/.config/systemd/user/
   ```
   then edit them to set the correct paths for the binaries and config file.
2. Reload systemd and enable the services:
   ```sh
   systemctl --user daemon-reload
   systemctl --user enable --now codesearch-server.service codesearch-updater.service
   ```

- `codesearch-server.service` runs the HTTP server (`cserver`).
- `codesearch-updater.service` keeps the repositories and index up to date (`csupdater`).
