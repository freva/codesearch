all: restart ui

go:
	go install ./...

test:
	go test ./...

ui:
	cd frontend && yarn install && yarn build --outDir ../cmd/cserver/static

restart: go
	systemctl --user restart codesearch-server.service

update:
	~/.go/bin/csupdater --config ./config
