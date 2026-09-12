# Namdar OS OpenData import runbook

Last reviewed: 2026-09-12

This runbook covers **OS Open UPRN** and **Code-Point Open** only. It does not grant rights for any other OS/Royal Mail/full-address product.

## Safety defaults

`scripts/os-open-data-import.mjs` is intentionally conservative:

- dry-run unless `--write` is present;
- default scope is `active-service-areas`;
- write mode checks the source rights registry before any row is stored;
- write mode reads current `service_areas` dynamically;
- national `scope=GB` writes are blocked unless `--allow-large-import` is explicitly supplied;
- `--complete-scope` cannot be combined with `--max-rows`;
- `--activate-source` requires `--complete-scope`;
- a source remains inactive until deliberately activated after a complete intended-scope import.

Never use `--allow-large-import` on the current Supabase Free database merely to bypass the guard. Move/upgrade the data layer first.

## Runtime secrets

Write mode requires server-side runtime environment only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or the supported server secret-key replacement)

Never commit/log/share these values. Dry-run parsing can operate without Supabase credentials when the required service-area filter is supplied locally.

## Input files

Download from the official OS Downloads API and extract locally. The script accepts either:

- one CSV file; or
- a directory, scanned recursively for `.csv` files.

Product IDs used by the importer:

- OS Open UPRN: `OpenUPRN`
- Code-Point Open: `CodePointOpen`

If `--version` is omitted, the importer queries current OS product metadata and records the upstream version.

## Code-Point Open pilot

### Dry-run with explicit administrative codes

```bash
node scripts/os-open-data-import.mjs \
  --dataset=codepoint \
  --input=/path/to/codepoint-extracted \
  --version=<os-version> \
  --district-codes=<current-live-codes> \
  --max-rows=5000
```

Do not copy a historic borough-code list from documentation into automation. For real writes, the script reads the live active service areas itself.

### Service-area write

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/os-open-data-import.mjs \
  --dataset=codepoint \
  --input=/path/to/codepoint-extracted \
  --write
```

This is a partial/pilot import by default and does not activate the source.

After validating coverage/counts/coordinates, a genuinely complete refresh of the intended service-area scope may be run with:

```bash
... --write --complete-scope --activate-source
```

Only do this when the whole intended service-area source file has been scanned; never when `--max-rows` truncates the run.

## OS Open UPRN pilot

Open UPRN is a very large national file. The importer streams it line-by-line so only selected service-area properties are written, but the runner still needs enough disk/network/CPU to obtain and scan the full source.

### Local GeoJSON dry-run

```bash
node scripts/os-open-data-import.mjs \
  --dataset=uprn \
  --input=/path/to/open-uprn.csv \
  --version=<os-version> \
  --geojson=/path/to/current-service-area.geojson \
  --max-rows=5000
```

### Service-area write

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/os-open-data-import.mjs \
  --dataset=uprn \
  --input=/path/to/open-uprn.csv \
  --write
```

Write mode loads live `service_areas` and uses polygon/MultiPolygon geometry exactly. If a service area has geometry, the importer does **not** expand it using the radius fallback.

## National scale

The current app database is not the target for a national 40m+ UPRN warehouse.

Before any `--scope=GB --write --allow-large-import` operation:

1. choose/provision the national data store;
2. estimate table + index + staging/headroom size;
3. design bulk loading rather than REST batches;
4. benchmark postcode/UPRN queries and refresh windows;
5. preserve source/version/import-run provenance;
6. verify OGL attribution and product delivery rights;
7. verify backups/restore and update rollback strategy;
8. only then remove the operational capacity blocker for that environment.

## Production verification after an import

Check:

- `open_data_import_runs` status/version/scope/counts;
- `address_dataset_health.count_in_sync = true` for imported source;
- row count and active-row count are plausible;
- service-area Code-Point rows have expected administrative district codes;
- UPRN coordinates fall inside intended service-area geometry;
- no source was activated by a truncated sample;
- rights-filtered commercial views contain only active, redistribution/API-approved sources;
- database size/headroom remains safe;
- `/api/address-data-v1` remains disabled until the separate commercial-launch checklist is complete.

## Source refresh procedure

For every new OS release:

1. discover/record current OS product version;
2. dry-run parser/filter against the new files;
3. compare selected row counts with prior run;
4. investigate unexpected jumps/drops before write;
5. write a full intended-scope refresh;
6. use `--complete-scope` only after the full scope was scanned;
7. activate only when product/source readiness is intentional;
8. verify counts, health, attribution, API isolation and database capacity.
