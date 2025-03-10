all: restart ui

go:
	go install ./...

ui:
	cd cmd/frontend && yarn build --outDir ../cserver/static

restart: go
	systemctl --user restart codesearch-server.service

update:
	./updater/bin/updater -c ./config
