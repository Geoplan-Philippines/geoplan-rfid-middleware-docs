GROUPS.push(
{
    id: 'master-data-sync',
    name: 'Master Data Sync',
    blurb:
      'GeoPlan-owned endpoints for importing partner product masters, inspecting the local copy, and exposing changes downstream. ' +
      'ETP POS and Samooha source-endpoint requirements are documented separately above.',
    endpoints: [
      {
        id: 'list-master-data',
        method: 'GET',
        path: '/master-data-sync',
        title: 'List synced products',
        status: 'implemented',
        auth: true,
        source: 'src/modules/master-data-sync/master-data-sync.controller.ts',
        description:
          'Paginated, filterable view of locally synced product master records (SKU, GTIN, product ' +
          'name, optional EPC/TID). Filters are case-insensitive "contains" matches. Ordered by most recently updated.',
        queryParams: [
          { name: 'page', type: 'integer', required: false, default: '1', description: 'Page number (min 1).' },
          { name: 'limit', type: 'integer', required: false, default: '10', description: 'Items per page (1–50).' },
          { name: 'sku', type: 'string', required: false, description: 'Filter by SKU (contains).' },
          { name: 'gtin', type: 'string', required: false, description: 'Filter by GTIN/barcode (contains).' },
          { name: 'productName', type: 'string', required: false, description: 'Filter by product name (contains).' },
        ],
        responses: [
          {
            status: 200,
            description: 'Paginated product records with meta.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [
                {
                  id: 'c0a8011e-1d2f-4a3b-9c4d-5e6f70819203',
                  sku: 'LAC-POLO-NVY-M',
                  gtin: '3614030000123',
                  productName: 'Lacoste Classic Polo Navy M',
                  epc: null,
                  tid: null,
                  createdAt: '2026-06-20T02:00:00.000Z',
                  updatedAt: '2026-06-24T01:30:00.000Z',
                },
              ],
              meta: { total: 14820, page: 1, limit: 10, lastPage: 1482 },
            },
          },
        ],
        errors: [
          { status: 400, code: 'BadRequest', when: 'limit > 50 or non-integer page/limit.' },
          { status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' },
        ],
      },
      {
        id: 'run-master-data-sync',
        method: 'POST',
        path: '/master-data-sync/run',
        title: 'Trigger a sync run',
        status: 'implemented',
        auth: true,
        source: 'src/modules/master-data-sync/master-data-sync.controller.ts',
        description:
          'Pulls product pages from the configured source (MASTER_DATA_SYNC_URL → /api/v1/products), ' +
          'paging at 1000/page with concurrency 5, and upserts by SKU in batches of 100. Items marked ' +
          'isDeleted are removed. The first run is full; later runs automatically use the latest successful checkpoint.',
        queryParams: [
          {
            name: 'lastSyncAt',
            type: 'ISO-8601 datetime',
            required: false,
            description: 'Override the stored successful checkpoint and request records updated after this time.',
          },
          {
            name: 'full',
            type: 'boolean',
            required: false,
            default: 'false',
            description: 'Set true to intentionally bypass the stored checkpoint and run a full import.',
          },
        ],
        responses: [
          {
            status: 200,
            description: 'Sync run summary.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                syncMode: 'DELTA',
                checkpointUsed: '2026-06-27T16:00:00.000Z',
                pagesFetched: 1,
                totalItems: 100000,
                recordsChecked: 10,
                recordsSkipped: 99990,
                totalFetched: 10,
                upserted: 9,
                deleted: 1,
                durationMs: 423,
                lastSyncAt: '2026-06-28T16:00:00.000Z',
              },
            },
          },
        ],
        errors: [
          { status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' },
          { status: 503, code: 'ServiceUnavailable', when: 'Upstream master data source returned a non-2xx for any page.' },
        ],
        notes: [
          'lastSyncAt is the source-generated snapshot checkpoint and is stored automatically after success.',
          'totalFetched remains as a compatibility alias for recordsChecked.',
          'The current module persists SKU, barcode as GTIN, and name. EPC/TID associations remain GeoPlan-owned.',
        ],
      },
      {
        id: 'master-data-delta',
        method: 'GET',
        path: '/master-data-sync/delta',
        title: 'Cache delta feed (bridge agents)',
        status: 'implemented',
        auth: true,
        source: 'src/modules/master-data-sync/master-data-sync.controller.ts',
        description:
          'Incremental feed the bridge-agent Cache Sync Service polls to keep each store’s local Redis EPC↔SKU ' +
          'cache current without a full reload. Returns upserts + tombstones (deletes) since a cursor. Closes the ' +
          'gap between a middleware sync run and the edge caches that the checkout hot path depends on.',
        queryParams: [
          { name: 'since', type: 'ISO-8601 datetime', required: false, description: 'Return changes after this cursor. Omit for full snapshot.' },
          { name: 'limit', type: 'integer', required: false, default: '1000', description: 'Max records per page.' },
        ],
        responses: [
          {
            status: 200,
            description: 'Changed records + deletions since the cursor.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                cursor: '2026-06-24T08:20:11.512Z',
                upserts: [{ sku: 'LAC-POLO-NVY-M', gtin: '3614030000123', productName: 'Lacoste Classic Polo Navy M' }],
                deletes: ['LAC-OLD-SKU-001'],
              },
            },
          },
        ],
        notes: ['This endpoint is GeoPlan-owned and is consumed by downstream bridge agents, not by ETP POS or Samooha.'],
      },
      {
        id: 'master-data-status',
        method: 'GET',
        path: '/master-data-sync/status',
        title: 'Last sync status / history',
        status: 'implemented',
        auth: true,
        source: 'src/modules/master-data-sync/master-data-sync.controller.ts',
        description:
          'Returns the outcome of recent sync runs (timestamp, counts, duration, success/failure) so ops can ' +
          'confirm freshness and diagnose stale caches without reading server logs.',
        queryParams: [
          { name: 'historyLimit', type: 'integer', required: false, default: '10', description: 'Recent sync runs to return (1–50).' },
        ],
        responses: [
          {
            status: 200,
            description: 'Most recent run + short history.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                lastRun: { lastSyncAt: '2026-06-24T08:20:11.512Z', upserted: 14820, durationMs: 8423, status: 'SUCCESS' },
                history: [{ lastSyncAt: '2026-06-23T02:00:00.000Z', upserted: 120, durationMs: 1102, status: 'SUCCESS' }],
              },
            },
          },
        ],
      },
    ],
  }
);
