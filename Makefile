all: restart ui

go:
	go install ./...

ui:
	cd frontend && yarn install && yarn build --outDir ../cmd/cserver/static

restart: go
	systemctl --user restart codesearch-server.service

update:
	./updater/bin/updater -c ./config
