all: ui restart

go:
	go install ./...

test:
	go test ./...

ui:
	cd frontend && pnpm install && pnpm build --emptyOutDir --outDir ../cmd/cserver/static

restart: go
	systemctl --user restart codesearch-server.service

update:
	~/.go/bin/csupdater --config ./config
