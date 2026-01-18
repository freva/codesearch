all: ui go
all-restart: all
	systemctl --user restart codesearch-server.service

go:
	go install ./...

test:
	go test ./...

ui:
	cd frontend && pnpm install && pnpm build --emptyOutDir --outDir ../cmd/cserver/static

update:
	~/.go/bin/csupdater --config ./config
