@default:
	just list

@run:
	bun --hot src/index.ts

@watch:
	bun --watch src/index.ts
