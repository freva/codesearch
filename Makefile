all: restart ui

go:
	go install ./...

ui:
	cd cmd/frontend && yarn install && yarn build --outDir ../cserver/static

restart: go
	systemctl --user restart codesearch-server.service

update:
	~/.go/bin/csupdater --config ./config
