/**
 * SSI RFID Middleware — API reference data.
 *
 * Single source of truth for the standalone docs site. Each endpoint is a plain
 * object so non-developers can extend it without touching render logic.
 *
 * status: 'implemented' = code exists in this repo today.
 *         'planned'     = proposed endpoint derived from the project brief /
 *                         discovery tracker; NOT built yet.
 *
 * Keep this file in sync with the NestJS controllers under `src/modules`.
 */

const API_INFO = {
  title: 'SSI RFID Middleware API',
  subtitle: 'Integration layer between GeoPlan, ETP POS, SAP/Samooha and the store bridge agents',
  baseUrl: 'http://localhost:8000/api/v1',
  goLive: 'October 1, 2026',
  repo: 'ssi-rfid-middleware (NestJS / TypeScript / Prisma / PostgreSQL)',
};

/**
 * Cross-cutting conventions that apply to every endpoint. Rendered once at the
 * top so individual endpoint cards stay focused on their own payloads.
 */
const CONVENTIONS = [
  {
    title: 'Base URL & versioning',
    body:
      'All routes are served under the global prefix <code>/api</code> with URI versioning, ' +
      'default version <code>v1</code>. Effective base URL in local dev is ' +
      '<code>http://localhost:8000/api/v1</code> (port from <code>PORT</code>, default 8000).',
  },
  {
    title: 'Authentication',
    body:
      'Send your key in the <code>x-api-key</code> request header. A global guard ' +
      'protects every route except those explicitly marked <em>Public</em> ' +
      '(health check + API-key creation). Missing/invalid keys return <code>401</code>. ' +
      'Keys are SHA-256 hashed at rest — the plaintext is shown only once at creation.',
  },
  {
    title: 'Success envelope',
    body:
      'Successful responses are wrapped by a global interceptor:<br>' +
      '<code>{ "statusCode": number, "message": "Success", "data": &lt;payload&gt; }</code>.<br>' +
      'Paginated endpoints additionally hoist a <code>meta</code> object to the top level.',
  },
  {
    title: 'Error envelope',
    body:
      'Errors are emitted by a global exception filter (NOT wrapped in the success envelope):<br>' +
      '<code>{ "statusCode", "message", "error", "path", "timestamp" }</code>. ' +
      '<code>message</code> may be a string or an array of validation messages.',
  },
  {
    title: 'Validation',
    body:
      'Request bodies/queries are validated with a strict global pipe ' +
      '(<code>whitelist</code> + <code>forbidNonWhitelisted</code> + <code>transform</code>). ' +
      'Unknown fields are rejected with <code>400</code>.',
  },
  {
    title: 'Rate limiting',
    body:
      'Global throttle of <strong>100 requests / 60 seconds</strong> per client. ' +
      'Exceeding it returns <code>429 Too Many Requests</code>.',
  },
  {
    title: 'Pagination',
    body:
      'List endpoints accept <code>page</code> (min 1, default 1) and <code>limit</code> ' +
      '(1–50, default 10). Responses include ' +
      '<code>meta: { total, page, limit, lastPage }</code>.',
  },
];

const GROUPS = [
  /* ------------------------------------------------------------------ */
  /* SYSTEM & HEALTH                                                      */
  /* ------------------------------------------------------------------ */
  {
    id: 'system',
    name: 'System & Health',
    blurb: 'Liveness/readiness probes and the default service root.',
    endpoints: [
      {
        id: 'health-check',
        method: 'GET',
        path: '/health',
        title: 'Health check',
        status: 'implemented',
        auth: false,
        source: 'src/core/health/health.controller.ts',
        description:
          'Liveness/readiness probe. Runs a Prisma ping against PostgreSQL so an orchestrator ' +
          '(Cloud Run, k8s, load balancer) can tell whether the service AND its database are up. Public — no API key required.',
        responses: [
          {
            status: 200,
            description: 'Service and database healthy.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                status: 'ok',
                info: { database: { status: 'up' } },
                error: {},
                details: { database: { status: 'up' } },
              },
            },
          },
        ],
        errors: [
          { status: 503, code: 'ServiceUnavailable', when: 'Database ping fails — body contains the failing indicator under "error".' },
        ],
      },
      {
        id: 'service-root',
        method: 'GET',
        path: '/',
        title: 'Service root (scaffold)',
        status: 'implemented',
        auth: true,
        source: 'src/app.controller.ts',
        description:
          'Default NestJS scaffold route returning a static greeting. Kept for a trivial ' +
          '"is the app reachable" smoke test. Candidate for removal once a real landing/info ' +
          'endpoint exists.',
        responses: [
          {
            status: 200,
            description: 'Static greeting wrapped in the standard envelope.',
            sample: { statusCode: 200, message: 'Success', data: 'Hello World!' },
          },
        ],
        errors: [{ status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' }],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* API KEYS                                                            */
  /* ------------------------------------------------------------------ */
  {
    id: 'api-keys',
    name: 'Authentication — API Keys',
    blurb:
      'Issue and manage the API keys that authenticate partner systems (ETP, GeoPlan, bridge agents). ' +
      'Keys are stored as SHA-256 hashes; the plaintext is returned exactly once.',
    endpoints: [
      {
        id: 'create-api-key',
        method: 'POST',
        path: '/api-keys',
        title: 'Create API key',
        status: 'implemented',
        auth: false,
        source: 'src/modules/api-keys/api-keys.controller.ts',
        description:
          'Generates a new API key (prefix "rfid_"), stores only its hash, and returns the plaintext ' +
          'key once. The caller MUST capture the plaintext immediately — it cannot be recovered later. ' +
          'Currently Public to allow first-key bootstrap; lock this down (network policy / admin guard) before production.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'name', type: 'string', required: true, description: 'Human label for the key. Max 120 chars.' },
          ],
          sample: { name: 'ETP POS — Store 014' },
        },
        responses: [
          {
            status: 201,
            description: 'Key created. "apiKey" appears only in this response.',
            sample: {
              statusCode: 201,
              message: 'Success',
              data: {
                id: '9f1c2b6e-2c4a-4f1e-9a3d-7b0c5e8a1f23',
                name: 'ETP POS — Store 014',
                apiKey: 'rfid_8Xk2...redacted...Qz',
                createdAt: '2026-06-24T08:15:00.000Z',
                updatedAt: '2026-06-24T08:15:00.000Z',
              },
            },
          },
        ],
        errors: [{ status: 400, code: 'BadRequest', when: 'Missing/empty "name" or unknown fields.' }],
      },
      {
        id: 'list-api-keys',
        method: 'GET',
        path: '/api-keys',
        title: 'List API keys',
        status: 'implemented',
        auth: true,
        source: 'src/modules/api-keys/api-keys.controller.ts',
        description: 'Lists key metadata, newest first. Secrets/hashes are never returned.',
        responses: [
          {
            status: 200,
            description: 'Array of key metadata.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [
                {
                  id: '9f1c2b6e-2c4a-4f1e-9a3d-7b0c5e8a1f23',
                  name: 'ETP POS — Store 014',
                  createdAt: '2026-06-24T08:15:00.000Z',
                  updatedAt: '2026-06-24T08:15:00.000Z',
                },
              ],
            },
          },
        ],
        errors: [{ status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' }],
      },
      {
        id: 'revoke-api-key',
        method: 'DELETE',
        path: '/api-keys/:id',
        title: 'Revoke API key',
        status: 'implemented',
        auth: true,
        source: 'src/modules/api-keys/api-keys.controller.ts',
        description: 'Permanently deletes (revokes) a key by id. Effective immediately.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'API key id.' }],
        responses: [{ status: 204, description: 'Revoked. Empty body.', sample: null }],
        errors: [
          { status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' },
          { status: 404, code: 'NotFound', when: 'No key with that id.' },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* MASTER DATA SYNC                                                     */
  /* ------------------------------------------------------------------ */
  {
    id: 'master-data-sync',
    name: 'Master Data Sync',
    blurb:
      'ETL of product master data from the upstream source (likely SAP) into the middleware, ' +
      'then onward to bridge-agent Redis caches and the ETP product master. Upsert-by-SKU with per-item isolation.',
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
          'paging at 1000/page with concurrency 5, and upserts by SKU in batches of 100. Items flagged ' +
          'isDeleted are removed. Pass lastSyncAt for an incremental (delta) run; omit it for a full sync.',
        queryParams: [
          {
            name: 'lastSyncAt',
            type: 'ISO-8601 datetime',
            required: false,
            description: 'Only fetch source records updated after this timestamp (incremental). Omit for full sync.',
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
                pagesFetched: 15,
                totalFetched: 14820,
                upserted: 14820,
                durationMs: 8423,
                lastSyncAt: '2026-06-24T08:20:11.512Z',
              },
            },
          },
        ],
        errors: [
          { status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' },
          { status: 503, code: 'ServiceUnavailable', when: 'Upstream master data source returned a non-2xx for any page.' },
        ],
        notes: [
          'Returned lastSyncAt is captured at run start — feed it into the next incremental run.',
          'Source contract is the ICD master-data feed; only sku/gtin(barcode)/productName(name) are currently persisted.',
        ],
      },
      {
        id: 'master-data-delta',
        method: 'GET',
        path: '/master-data-sync/delta',
        title: 'Cache delta feed (bridge agents)',
        status: 'planned',
        auth: true,
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
        notes: ['Supports the brief’s SAP → Middleware → Bridge Redis → ETP master flow.'],
      },
      {
        id: 'master-data-status',
        method: 'GET',
        path: '/master-data-sync/status',
        title: 'Last sync status / history',
        status: 'planned',
        auth: true,
        description:
          'Returns the outcome of recent sync runs (timestamp, counts, duration, success/failure) so ops can ' +
          'confirm freshness and diagnose stale caches without reading server logs.',
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
  },

  /* ------------------------------------------------------------------ */
  /* EPC SCAN PROCESSING                                                  */
  /* ------------------------------------------------------------------ */
  {
    id: 'epc-scan-processing',
    name: 'EPC Scan Processing',
    blurb:
      'Aggregates raw EPC reads from handheld/fixed readers into a deduplicated scan session ' +
      '(dedupe on EPC, per-session). Used for cycle counts, stock checks, picking and goods receipt staging.',
    endpoints: [
      {
        id: 'start-session',
        method: 'POST',
        path: '/epc-scan-processing/sessions',
        title: 'Start scan session',
        status: 'implemented',
        auth: true,
        source: 'src/modules/epc-scan-processing/epc-scan-processing.controller.ts',
        description:
          'Opens a new scan session (status OPEN). Optionally tag it with a business transaction reference ' +
          'and the originating device id. Returns the empty session ready to receive reads.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'transactionReference', type: 'string', required: false, description: 'Business reference (e.g. cycle-count/GR doc). Max 120.' },
            { name: 'deviceId', type: 'string', required: false, description: 'Originating reader/device id. Max 120.' },
          ],
          sample: { transactionReference: 'CC-2026-0624-014', deviceId: 'HANDHELD-014-02' },
        },
        responses: [
          {
            status: 201,
            description: 'Session opened.',
            sample: {
              statusCode: 201,
              message: 'Success',
              data: {
                id: '6f9619ff-8b86-d011-b42d-00cf4fc964ff',
                transactionReference: 'CC-2026-0624-014',
                deviceId: 'HANDHELD-014-02',
                status: 'OPEN',
                startedAt: '2026-06-24T08:30:00.000Z',
                completedAt: null,
                uniqueCount: 0,
                epcs: [],
              },
            },
          },
        ],
        errors: [{ status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' }],
      },
      {
        id: 'append-reads',
        method: 'POST',
        path: '/epc-scan-processing/sessions/:sessionId/reads',
        title: 'Append EPC reads',
        status: 'implemented',
        auth: true,
        source: 'src/modules/epc-scan-processing/epc-scan-processing.controller.ts',
        description:
          'Appends a batch of EPC reads to an OPEN session. EPCs are normalised (trim + uppercase) and ' +
          'deduplicated; repeat EPCs increment a per-EPC read counter rather than creating duplicates. ' +
          'Returns the full deduplicated session state.',
        pathParams: [{ name: 'sessionId', type: 'uuid', description: 'Target session id.' }],
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'epcs', type: 'string[]', required: true, description: 'Non-empty array of EPC hex strings. 1–1000 items, each ≤128 chars.' },
          ],
          sample: { epcs: ['E2801170200000000000ABCD', 'e2801170200000000000abcd', 'E28011702000000000001234'] },
        },
        responses: [
          {
            status: 200,
            description: 'Reads merged; deduplicated session returned (note the two identical EPCs collapse to one).',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                id: '6f9619ff-8b86-d011-b42d-00cf4fc964ff',
                transactionReference: 'CC-2026-0624-014',
                deviceId: 'HANDHELD-014-02',
                status: 'OPEN',
                startedAt: '2026-06-24T08:30:00.000Z',
                completedAt: null,
                uniqueCount: 2,
                epcs: ['E28011702000000000001234', 'E2801170200000000000ABCD'],
              },
            },
          },
        ],
        errors: [
          { status: 400, code: 'BadRequest', when: 'Empty array, >1000 items, or all-blank EPCs.' },
          { status: 404, code: 'NotFound', when: 'No session with that id.' },
          { status: 409, code: 'Conflict', when: 'Session already COMPLETED (not OPEN).' },
        ],
      },
      {
        id: 'get-session',
        method: 'GET',
        path: '/epc-scan-processing/sessions/:sessionId',
        title: 'Get scan session',
        status: 'implemented',
        auth: true,
        source: 'src/modules/epc-scan-processing/epc-scan-processing.controller.ts',
        description: 'Returns the current session state with its full deduplicated EPC list (sorted ascending).',
        pathParams: [{ name: 'sessionId', type: 'uuid', description: 'Session id.' }],
        responses: [
          {
            status: 200,
            description: 'Session snapshot.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                id: '6f9619ff-8b86-d011-b42d-00cf4fc964ff',
                transactionReference: 'CC-2026-0624-014',
                deviceId: 'HANDHELD-014-02',
                status: 'OPEN',
                startedAt: '2026-06-24T08:30:00.000Z',
                completedAt: null,
                uniqueCount: 2,
                epcs: ['E28011702000000000001234', 'E2801170200000000000ABCD'],
              },
            },
          },
        ],
        errors: [{ status: 404, code: 'NotFound', when: 'No session with that id.' }],
      },
      {
        id: 'complete-session',
        method: 'POST',
        path: '/epc-scan-processing/sessions/:sessionId/complete',
        title: 'Complete scan session',
        status: 'implemented',
        auth: true,
        source: 'src/modules/epc-scan-processing/epc-scan-processing.controller.ts',
        description:
          'Closes an OPEN session (status → COMPLETED, stamps completedAt). Idempotent: re-completing an ' +
          'already-completed session returns it unchanged. The frozen EPC set is the input to downstream ' +
          'inventory events (e.g. goods receipt / cycle count posting).',
        pathParams: [{ name: 'sessionId', type: 'uuid', description: 'Session id.' }],
        responses: [
          {
            status: 200,
            description: 'Session completed (or already complete).',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                id: '6f9619ff-8b86-d011-b42d-00cf4fc964ff',
                transactionReference: 'CC-2026-0624-014',
                deviceId: 'HANDHELD-014-02',
                status: 'COMPLETED',
                startedAt: '2026-06-24T08:30:00.000Z',
                completedAt: '2026-06-24T08:45:12.000Z',
                uniqueCount: 2,
                epcs: ['E28011702000000000001234', 'E2801170200000000000ABCD'],
              },
            },
          },
        ],
        errors: [
          { status: 404, code: 'NotFound', when: 'No session with that id.' },
          { status: 409, code: 'Conflict', when: 'Session could not be completed (unexpected state transition).' },
        ],
      },
      {
        id: 'list-sessions',
        method: 'GET',
        path: '/epc-scan-processing/sessions',
        title: 'List scan sessions',
        status: 'planned',
        auth: true,
        description:
          'Paginated/filterable list of sessions (by status, device, date range). Needed for an ops view of ' +
          'in-progress and historical counts; today sessions are only retrievable by exact id.',
        queryParams: [
          { name: 'status', type: 'enum(OPEN|COMPLETED)', required: false, description: 'Filter by status.' },
          { name: 'deviceId', type: 'string', required: false, description: 'Filter by originating device.' },
          { name: 'page', type: 'integer', required: false, default: '1', description: 'Page number.' },
          { name: 'limit', type: 'integer', required: false, default: '10', description: 'Items per page (1–50).' },
        ],
        responses: [
          {
            status: 200,
            description: 'Paginated sessions (without full EPC arrays).',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [
                { id: '6f9619ff-8b86-d011-b42d-00cf4fc964ff', status: 'COMPLETED', deviceId: 'HANDHELD-014-02', uniqueCount: 2, startedAt: '2026-06-24T08:30:00.000Z' },
              ],
              meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
            },
          },
        ],
      },
      {
        id: 'cancel-session',
        method: 'POST',
        path: '/epc-scan-processing/sessions/:sessionId/cancel',
        title: 'Cancel scan session',
        status: 'planned',
        auth: true,
        description:
          'Aborts an OPEN session (e.g. mis-scan / wrong reference) without it counting as a completed count. ' +
          'Requires adding a CANCELLED state to the session status enum.',
        pathParams: [{ name: 'sessionId', type: 'uuid', description: 'Session id.' }],
        responses: [
          {
            status: 200,
            description: 'Session cancelled.',
            sample: { statusCode: 200, message: 'Success', data: { id: '6f9619ff-8b86-d011-b42d-00cf4fc964ff', status: 'CANCELLED' } },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* RFID READERS                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: 'rfid-readers',
    name: 'RFID Readers',
    blurb:
      'Registry/CRUD for physical RFID hardware (iData flatbed scanners, handhelds, fixed dock/gate readers). ' +
      'Tracks identity, network address and operational status.',
    endpoints: [
      {
        id: 'create-reader',
        method: 'POST',
        path: '/rfid-readers',
        title: 'Register reader',
        status: 'implemented',
        auth: true,
        source: 'src/modules/rfid-readers/rfid-readers.controller.ts',
        description: 'Registers a new RFID reader. serialNumber must be unique. Defaults status to ACTIVE.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'name', type: 'string', required: true, description: 'Display name. Max 120.' },
            { name: 'serialNumber', type: 'string', required: true, description: 'Unique hardware serial. Max 100.' },
            { name: 'model', type: 'string', required: false, description: 'Hardware model. Max 120.' },
            { name: 'ipAddress', type: 'string (IP)', required: false, description: 'IPv4/IPv6 address.' },
            { name: 'status', type: 'enum(ACTIVE|INACTIVE|MAINTENANCE)', required: false, description: 'Defaults to ACTIVE.' },
            { name: 'notes', type: 'string', required: false, description: 'Free text. Max 500.' },
          ],
          sample: {
            name: 'Store 014 — Checkout 2 Flatbed',
            serialNumber: 'IDATA-A500-014-02',
            model: 'iData A500',
            ipAddress: '10.14.2.21',
            status: 'ACTIVE',
            notes: 'USB to POS terminal 2',
          },
        },
        responses: [
          {
            status: 201,
            description: 'Reader created.',
            sample: {
              statusCode: 201,
              message: 'Success',
              data: {
                id: 'b1d9f4a2-3c5e-4f8a-9b1c-2d3e4f5a6b7c',
                name: 'Store 014 — Checkout 2 Flatbed',
                serialNumber: 'IDATA-A500-014-02',
                model: 'iData A500',
                ipAddress: '10.14.2.21',
                status: 'ACTIVE',
                notes: 'USB to POS terminal 2',
                createdAt: '2026-06-24T09:00:00.000Z',
                updatedAt: '2026-06-24T09:00:00.000Z',
              },
            },
          },
        ],
        errors: [
          { status: 400, code: 'BadRequest', when: 'Validation failure (e.g. invalid IP, missing name/serial).' },
          { status: 409, code: 'Conflict', when: 'serialNumber already registered (unique constraint).' },
        ],
      },
      {
        id: 'list-readers',
        method: 'GET',
        path: '/rfid-readers',
        title: 'List readers',
        status: 'implemented',
        auth: true,
        source: 'src/modules/rfid-readers/rfid-readers.controller.ts',
        description: 'Lists all readers, optionally filtered by status.',
        queryParams: [
          { name: 'status', type: 'enum(ACTIVE|INACTIVE|MAINTENANCE)', required: false, description: 'Filter by operational status.' },
        ],
        responses: [
          {
            status: 200,
            description: 'Array of readers.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [
                {
                  id: 'b1d9f4a2-3c5e-4f8a-9b1c-2d3e4f5a6b7c',
                  name: 'Store 014 — Checkout 2 Flatbed',
                  serialNumber: 'IDATA-A500-014-02',
                  model: 'iData A500',
                  ipAddress: '10.14.2.21',
                  status: 'ACTIVE',
                  notes: 'USB to POS terminal 2',
                  createdAt: '2026-06-24T09:00:00.000Z',
                  updatedAt: '2026-06-24T09:00:00.000Z',
                },
              ],
            },
          },
        ],
        errors: [{ status: 400, code: 'BadRequest', when: 'status is not a valid enum value.' }],
      },
      {
        id: 'get-reader',
        method: 'GET',
        path: '/rfid-readers/:id',
        title: 'Get reader',
        status: 'implemented',
        auth: true,
        source: 'src/modules/rfid-readers/rfid-readers.controller.ts',
        description: 'Fetches a single reader by id.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Reader id.' }],
        responses: [
          {
            status: 200,
            description: 'Reader.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                id: 'b1d9f4a2-3c5e-4f8a-9b1c-2d3e4f5a6b7c',
                name: 'Store 014 — Checkout 2 Flatbed',
                serialNumber: 'IDATA-A500-014-02',
                model: 'iData A500',
                ipAddress: '10.14.2.21',
                status: 'ACTIVE',
                notes: 'USB to POS terminal 2',
                createdAt: '2026-06-24T09:00:00.000Z',
                updatedAt: '2026-06-24T09:00:00.000Z',
              },
            },
          },
        ],
        errors: [{ status: 404, code: 'NotFound', when: 'No reader with that id.' }],
      },
      {
        id: 'update-reader',
        method: 'PATCH',
        path: '/rfid-readers/:id',
        title: 'Update reader',
        status: 'implemented',
        auth: true,
        source: 'src/modules/rfid-readers/rfid-readers.controller.ts',
        description: 'Partially updates a reader. Any subset of the create fields is accepted.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Reader id.' }],
        requestBody: {
          contentType: 'application/json',
          fields: [{ name: '(any create field)', type: 'partial', required: false, description: 'Provide only the fields to change.' }],
          sample: { status: 'MAINTENANCE', notes: 'RMA pending — antenna fault' },
        },
        responses: [
          {
            status: 200,
            description: 'Updated reader.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                id: 'b1d9f4a2-3c5e-4f8a-9b1c-2d3e4f5a6b7c',
                name: 'Store 014 — Checkout 2 Flatbed',
                serialNumber: 'IDATA-A500-014-02',
                model: 'iData A500',
                ipAddress: '10.14.2.21',
                status: 'MAINTENANCE',
                notes: 'RMA pending — antenna fault',
                createdAt: '2026-06-24T09:00:00.000Z',
                updatedAt: '2026-06-24T10:12:00.000Z',
              },
            },
          },
        ],
        errors: [
          { status: 400, code: 'BadRequest', when: 'Validation failure.' },
          { status: 404, code: 'NotFound', when: 'No reader with that id.' },
          { status: 409, code: 'Conflict', when: 'Changing serialNumber to one already in use.' },
        ],
      },
      {
        id: 'delete-reader',
        method: 'DELETE',
        path: '/rfid-readers/:id',
        title: 'Delete reader',
        status: 'implemented',
        auth: true,
        source: 'src/modules/rfid-readers/rfid-readers.controller.ts',
        description: 'Removes a reader from the registry.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Reader id.' }],
        responses: [{ status: 204, description: 'Deleted. Empty body.', sample: null }],
        errors: [{ status: 404, code: 'NotFound', when: 'No reader with that id.' }],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* SALE CONFIRMATION & TAG DEACTIVATION (planned)                      */
  /* ------------------------------------------------------------------ */
  {
    id: 'sale-confirmation',
    name: 'Sale Confirmation & Tag Deactivation',
    blurb:
      'POST-SALE relay only — outside the 3,000ms checkout hot path. ETP confirms a completed sale; the ' +
      'middleware relays a tag-deactivation command to GeoPlan → bridge agent. Core sale flow from the brief; not yet built.',
    endpoints: [
      {
        id: 'create-sale-confirmation',
        method: 'POST',
        path: '/sale-confirmations',
        title: 'Confirm sale (post-sale)',
        status: 'planned',
        auth: true,
        description:
          'ETP POS posts a completed sale with the EPCs that were billed. Middleware logs the POS integration ' +
          'event and queues tag deactivation downstream (GeoPlan → bridge agent → scanner). Must NEVER be called ' +
          'during active checkout — it runs after the bill is finalised, keeping the hot path GeoPlan-free.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'storeId', type: 'string', required: true, description: 'Store identifier.' },
            { name: 'posTransactionId', type: 'string', required: true, description: 'ETP receipt / transaction id (idempotency key).' },
            { name: 'soldAt', type: 'ISO-8601 datetime', required: true, description: 'Sale completion timestamp.' },
            { name: 'epcs', type: 'string[]', required: true, description: 'EPCs billed in the sale (RFID items only; mixed baskets omit non-RFID lines).' },
          ],
          sample: {
            storeId: 'STORE-014',
            posTransactionId: 'ETP-014-20260624-000871',
            soldAt: '2026-06-24T10:32:05.000Z',
            epcs: ['E2801170200000000000ABCD', 'E28011702000000000001234'],
          },
        },
        responses: [
          {
            status: 202,
            description: 'Accepted; deactivation queued.',
            sample: {
              statusCode: 202,
              message: 'Success',
              data: {
                saleConfirmationId: '7c2a1b90-9f3e-4d2a-8c1b-0a1b2c3d4e5f',
                posTransactionId: 'ETP-014-20260624-000871',
                deactivationStatus: 'QUEUED',
                queuedEpcCount: 2,
              },
            },
          },
        ],
        errors: [
          { status: 400, code: 'BadRequest', when: 'Missing storeId/posTransactionId/epcs.' },
          { status: 409, code: 'Conflict', when: 'Duplicate posTransactionId (already processed) — idempotent replay.' },
        ],
        notes: ['Idempotent on posTransactionId so POS retries do not double-deactivate.'],
      },
      {
        id: 'get-sale-confirmation',
        method: 'GET',
        path: '/sale-confirmations/:id',
        title: 'Get sale confirmation status',
        status: 'planned',
        auth: true,
        description: 'Returns the relay/deactivation status for a previously confirmed sale (QUEUED → SENT → DEACTIVATED / FAILED).',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Sale confirmation id.' }],
        responses: [
          {
            status: 200,
            description: 'Sale confirmation + per-EPC deactivation state.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                saleConfirmationId: '7c2a1b90-9f3e-4d2a-8c1b-0a1b2c3d4e5f',
                posTransactionId: 'ETP-014-20260624-000871',
                deactivationStatus: 'DEACTIVATED',
                epcs: [
                  { epc: 'E2801170200000000000ABCD', status: 'DEACTIVATED' },
                  { epc: 'E28011702000000000001234', status: 'DEACTIVATED' },
                ],
              },
            },
          },
        ],
        errors: [{ status: 404, code: 'NotFound', when: 'Unknown sale confirmation id.' }],
      },
      {
        id: 'get-tag-deactivation',
        method: 'GET',
        path: '/tag-deactivations/:id',
        title: 'Get tag deactivation command',
        status: 'planned',
        auth: true,
        description:
          'Status of an individual tag-deactivation command dispatched to GeoPlan/the bridge agent. Useful for ' +
          'reconciling failures (e.g. tag not present at scanner) independent of the originating sale.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Deactivation command id.' }],
        responses: [
          {
            status: 200,
            description: 'Command status.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: { id: 'd9...', epc: 'E2801170200000000000ABCD', status: 'DEACTIVATED', attempts: 1, lastError: null },
            },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* TAGS & EPC RESOLUTION (planned)                                     */
  /* ------------------------------------------------------------------ */
  {
    id: 'tags-epc',
    name: 'Tags & EPC Resolution',
    blurb:
      'EPC↔SKU resolution (cache hydration / fallback) and one-time tag commissioning. The checkout hot path ' +
      'uses the bridge’s local Redis cache; these endpoints serve cache warm-up and back-office lookups.',
    endpoints: [
      {
        id: 'resolve-epcs',
        method: 'POST',
        path: '/epc-resolution',
        title: 'Resolve EPCs to products (batch)',
        status: 'planned',
        auth: true,
        description:
          'Resolves a batch of EPCs to their product master records (SKU, GTIN, name). Server-side fallback for ' +
          'cache misses and for back-office tooling. NOT for the checkout hot path, which resolves locally in <5ms.',
        requestBody: {
          contentType: 'application/json',
          fields: [{ name: 'epcs', type: 'string[]', required: true, description: 'EPCs to resolve (1–1000).' }],
          sample: { epcs: ['E2801170200000000000ABCD', 'E28011702000000000009999'] },
        },
        responses: [
          {
            status: 200,
            description: 'Resolved + unresolved EPCs.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                resolved: [{ epc: 'E2801170200000000000ABCD', sku: 'LAC-POLO-NVY-M', gtin: '3614030000123', productName: 'Lacoste Classic Polo Navy M' }],
                unresolved: ['E28011702000000000009999'],
              },
            },
          },
        ],
      },
      {
        id: 'commission-tag',
        method: 'POST',
        path: '/tags/commission',
        title: 'Commission tag (EPC↔SKU)',
        status: 'planned',
        auth: true,
        description:
          'Associates a freshly encoded EPC (and optional TID) with a SKU at a tagging/encoding station, writing ' +
          'the epc/tid fields already present on the product master. Tags are one-time use per the brief.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'sku', type: 'string', required: true, description: 'SKU being tagged.' },
            { name: 'epc', type: 'string', required: true, description: 'Encoded EPC.' },
            { name: 'tid', type: 'string', required: false, description: 'Chip TID (immutable serial), if captured.' },
          ],
          sample: { sku: 'LAC-POLO-NVY-M', epc: 'E2801170200000000000ABCD', tid: 'E2801170200000ABCDEF0123' },
        },
        responses: [
          {
            status: 201,
            description: 'Tag commissioned.',
            sample: {
              statusCode: 201,
              message: 'Success',
              data: { sku: 'LAC-POLO-NVY-M', epc: 'E2801170200000000000ABCD', tid: 'E2801170200000ABCDEF0123', commissionedAt: '2026-06-24T07:00:00.000Z' },
            },
          },
        ],
        errors: [
          { status: 404, code: 'NotFound', when: 'SKU not in product master.' },
          { status: 409, code: 'Conflict', when: 'EPC already commissioned to another SKU.' },
        ],
      },
      {
        id: 'get-tag',
        method: 'GET',
        path: '/tags/:epc',
        title: 'Get tag by EPC',
        status: 'planned',
        auth: true,
        description: 'Single-EPC lookup returning the associated product and lifecycle state (commissioned/active/deactivated).',
        pathParams: [{ name: 'epc', type: 'string', description: 'EPC hex string.' }],
        responses: [
          {
            status: 200,
            description: 'Tag + product.',
            sample: { statusCode: 200, message: 'Success', data: { epc: 'E2801170200000000000ABCD', sku: 'LAC-POLO-NVY-M', state: 'ACTIVE' } },
          },
        ],
        errors: [{ status: 404, code: 'NotFound', when: 'EPC not commissioned.' }],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* INVENTORY EVENTS (planned)                                          */
  /* ------------------------------------------------------------------ */
  {
    id: 'inventory-events',
    name: 'Inventory Events',
    blurb:
      'Ingest aggregated RFID business events (goods receipt, goods issue, stock transfer, cycle count, return) ' +
      'from GeoPlan, translate EPC→SKU, and post inventory movements to SAP/Samooha. Posting is aggregated per ' +
      'shipment/delivery, never per-tag.',
    endpoints: [
      {
        id: 'create-inventory-event',
        method: 'POST',
        path: '/inventory-events',
        title: 'Ingest inventory event',
        status: 'planned',
        auth: true,
        description:
          'Receives a logical business event (already aggregated by GeoPlan) referencing EPCs or a completed scan ' +
          'session. Middleware translates EPCs to SKUs and stages an ERP posting. EPC internals stay invisible to SAP/Samooha.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'type', type: 'enum(GOODS_RECEIPT|GOODS_ISSUE|STOCK_TRANSFER|CYCLE_COUNT|RETURN)', required: true, description: 'Business event type.' },
            { name: 'referenceDocument', type: 'string', required: true, description: 'Source doc (delivery/shipment/transfer order).' },
            { name: 'locationId', type: 'string', required: true, description: 'Store/warehouse location.' },
            { name: 'sessionId', type: 'uuid', required: false, description: 'Completed scan session to source EPCs from (alternative to epcs).' },
            { name: 'epcs', type: 'string[]', required: false, description: 'Explicit EPC list (alternative to sessionId).' },
          ],
          sample: {
            type: 'GOODS_RECEIPT',
            referenceDocument: 'INB-2026-0091',
            locationId: 'WH-MAIN',
            sessionId: '6f9619ff-8b86-d011-b42d-00cf4fc964ff',
          },
        },
        responses: [
          {
            status: 202,
            description: 'Event accepted; ERP posting staged.',
            sample: {
              statusCode: 202,
              message: 'Success',
              data: {
                id: 'a1...',
                type: 'GOODS_RECEIPT',
                referenceDocument: 'INB-2026-0091',
                postingStatus: 'PENDING',
                lines: [{ sku: 'LAC-POLO-NVY-M', quantity: 1 }],
              },
            },
          },
        ],
        errors: [
          { status: 400, code: 'BadRequest', when: 'Neither sessionId nor epcs provided, or invalid type.' },
          { status: 422, code: 'UnprocessableEntity', when: 'EPCs cannot be resolved to SKUs — routed to exceptions.' },
        ],
      },
      {
        id: 'list-inventory-events',
        method: 'GET',
        path: '/inventory-events',
        title: 'List inventory events',
        status: 'planned',
        auth: true,
        description: 'Paginated/filterable list of ingested events and their ERP posting status.',
        queryParams: [
          { name: 'type', type: 'enum', required: false, description: 'Filter by event type.' },
          { name: 'postingStatus', type: 'enum(PENDING|POSTED|FAILED)', required: false, description: 'Filter by posting outcome.' },
          { name: 'page', type: 'integer', required: false, default: '1', description: 'Page number.' },
          { name: 'limit', type: 'integer', required: false, default: '10', description: 'Items per page.' },
        ],
        responses: [
          {
            status: 200,
            description: 'Paginated events.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [{ id: 'a1...', type: 'GOODS_RECEIPT', referenceDocument: 'INB-2026-0091', postingStatus: 'POSTED' }],
              meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
            },
          },
        ],
      },
      {
        id: 'get-inventory-event',
        method: 'GET',
        path: '/inventory-events/:id',
        title: 'Get inventory event',
        status: 'planned',
        auth: true,
        description: 'Full event detail including translated SKU lines and ERP posting references.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Event id.' }],
        responses: [
          {
            status: 200,
            description: 'Event detail.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: { id: 'a1...', type: 'GOODS_RECEIPT', postingStatus: 'POSTED', erpReference: 'SAP-490012345', lines: [{ sku: 'LAC-POLO-NVY-M', quantity: 1 }] },
            },
          },
        ],
        errors: [{ status: 404, code: 'NotFound', when: 'Unknown event id.' }],
      },
      {
        id: 'repost-inventory-event',
        method: 'POST',
        path: '/inventory-events/:id/post',
        title: 'Post / retry ERP posting',
        status: 'planned',
        auth: true,
        description: 'Manually (re)triggers the ERP posting for a PENDING/FAILED event after a transient SAP/Samooha outage.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Event id.' }],
        responses: [
          {
            status: 200,
            description: 'Posting attempted.',
            sample: { statusCode: 200, message: 'Success', data: { id: 'a1...', postingStatus: 'POSTED', erpReference: 'SAP-490012345' } },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* EXCEPTION HANDLING (planned)                                        */
  /* ------------------------------------------------------------------ */
  {
    id: 'exceptions',
    name: 'Exception Handling',
    blurb:
      'Queue for items needing human intervention: unknown/unresolvable EPCs, stock mismatches between RFID and ' +
      'POS (Q039), failed ERP postings, failed deactivations. Supports the brief’s exception-routing requirement.',
    endpoints: [
      {
        id: 'list-exceptions',
        method: 'GET',
        path: '/exceptions',
        title: 'List exceptions',
        status: 'planned',
        auth: true,
        description: 'Paginated/filterable queue of open and resolved exceptions across the integration.',
        queryParams: [
          { name: 'type', type: 'enum(UNKNOWN_EPC|STOCK_MISMATCH|POSTING_FAILED|DEACTIVATION_FAILED)', required: false, description: 'Filter by exception type.' },
          { name: 'status', type: 'enum(OPEN|RESOLVED)', required: false, description: 'Filter by state.' },
          { name: 'page', type: 'integer', required: false, default: '1', description: 'Page number.' },
          { name: 'limit', type: 'integer', required: false, default: '10', description: 'Items per page.' },
        ],
        responses: [
          {
            status: 200,
            description: 'Paginated exceptions.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [{ id: 'e1...', type: 'STOCK_MISMATCH', status: 'OPEN', context: { sku: 'LAC-POLO-NVY-M', rfidQty: 3, posQty: 2 }, createdAt: '2026-06-24T10:40:00.000Z' }],
              meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
            },
          },
        ],
      },
      {
        id: 'get-exception',
        method: 'GET',
        path: '/exceptions/:id',
        title: 'Get exception',
        status: 'planned',
        auth: true,
        description: 'Full exception detail with context payload for triage.',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Exception id.' }],
        responses: [
          {
            status: 200,
            description: 'Exception detail.',
            sample: { statusCode: 200, message: 'Success', data: { id: 'e1...', type: 'UNKNOWN_EPC', status: 'OPEN', context: { epc: 'E28011702000000000009999' } } },
          },
        ],
        errors: [{ status: 404, code: 'NotFound', when: 'Unknown exception id.' }],
      },
      {
        id: 'resolve-exception',
        method: 'POST',
        path: '/exceptions/:id/resolve',
        title: 'Resolve exception',
        status: 'planned',
        auth: true,
        description: 'Marks an exception resolved with a resolution note/action (e.g. re-tag, manual ERP adjustment, ignore).',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Exception id.' }],
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'resolution', type: 'string', required: true, description: 'How it was resolved.' },
            { name: 'resolvedBy', type: 'string', required: false, description: 'Operator id/name.' },
          ],
          sample: { resolution: 'Re-tagged item; manual GR adjustment in SAP', resolvedBy: 'tristan.dejesus' },
        },
        responses: [
          {
            status: 200,
            description: 'Exception resolved.',
            sample: { statusCode: 200, message: 'Success', data: { id: 'e1...', status: 'RESOLVED', resolvedAt: '2026-06-24T11:00:00.000Z' } },
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* DEVICE / BRIDGE AGENT MANAGEMENT (planned)                          */
  /* ------------------------------------------------------------------ */
  {
    id: 'devices',
    name: 'Device / Bridge Agent Management',
    blurb:
      'Fleet management for the per-terminal NodeJS bridge agents (GCP Device Manager). Registration, telemetry/' +
      'heartbeat ingestion, and the command channel that dispatches tag-deactivation commands to the edge.',
    endpoints: [
      {
        id: 'register-device',
        method: 'POST',
        path: '/devices',
        title: 'Register bridge agent',
        status: 'planned',
        auth: true,
        description: 'Registers a bridge agent (one per ETP POS terminal) for fleet management and command routing.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'deviceId', type: 'string', required: true, description: 'Stable agent identifier.' },
            { name: 'storeId', type: 'string', required: true, description: 'Store the terminal belongs to.' },
            { name: 'agentVersion', type: 'string', required: false, description: 'Bridge agent build version.' },
          ],
          sample: { deviceId: 'BRIDGE-014-02', storeId: 'STORE-014', agentVersion: '1.0.0' },
        },
        responses: [
          {
            status: 201,
            description: 'Device registered.',
            sample: { statusCode: 201, message: 'Success', data: { deviceId: 'BRIDGE-014-02', storeId: 'STORE-014', status: 'ONLINE', registeredAt: '2026-06-24T06:00:00.000Z' } },
          },
        ],
        errors: [{ status: 409, code: 'Conflict', when: 'deviceId already registered.' }],
      },
      {
        id: 'list-devices',
        method: 'GET',
        path: '/devices',
        title: 'List devices',
        status: 'planned',
        auth: true,
        description: 'Fleet view with last-seen and online/offline status; filterable by store.',
        queryParams: [
          { name: 'storeId', type: 'string', required: false, description: 'Filter by store.' },
          { name: 'status', type: 'enum(ONLINE|OFFLINE|DEGRADED)', required: false, description: 'Filter by health.' },
        ],
        responses: [
          {
            status: 200,
            description: 'Array of devices.',
            sample: { statusCode: 200, message: 'Success', data: [{ deviceId: 'BRIDGE-014-02', storeId: 'STORE-014', status: 'ONLINE', lastSeenAt: '2026-06-24T11:05:00.000Z' }] },
          },
        ],
      },
      {
        id: 'get-device',
        method: 'GET',
        path: '/devices/:deviceId',
        title: 'Get device',
        status: 'planned',
        auth: true,
        description: 'Single device detail including latest telemetry snapshot.',
        pathParams: [{ name: 'deviceId', type: 'string', description: 'Agent id.' }],
        responses: [
          {
            status: 200,
            description: 'Device detail.',
            sample: { statusCode: 200, message: 'Success', data: { deviceId: 'BRIDGE-014-02', status: 'ONLINE', cacheItems: 14820, bufferDepth: 0, agentVersion: '1.0.0' } },
          },
        ],
        errors: [{ status: 404, code: 'NotFound', when: 'Unknown deviceId.' }],
      },
      {
        id: 'device-telemetry',
        method: 'POST',
        path: '/devices/:deviceId/telemetry',
        title: 'Report telemetry / heartbeat',
        status: 'planned',
        auth: true,
        description:
          'Bridge agent Telemetry Reporter posts periodic health: cache size, write-ahead buffer depth, reader ' +
          'connectivity, last sync. Updates last-seen and feeds Cloud Monitoring.',
        pathParams: [{ name: 'deviceId', type: 'string', description: 'Agent id.' }],
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'cacheItems', type: 'integer', required: false, description: 'Records in local Redis cache.' },
            { name: 'bufferDepth', type: 'integer', required: false, description: 'Unsynced events in the SQLite write-ahead buffer.' },
            { name: 'readerOnline', type: 'boolean', required: false, description: 'Whether the attached scanner is reachable.' },
          ],
          sample: { cacheItems: 14820, bufferDepth: 0, readerOnline: true },
        },
        responses: [{ status: 204, description: 'Accepted. Empty body.', sample: null }],
      },
      {
        id: 'poll-device-commands',
        method: 'GET',
        path: '/devices/:deviceId/commands',
        title: 'Poll pending commands',
        status: 'planned',
        auth: true,
        description:
          'Bridge agent Tag Command Handler polls for pending commands (primarily tag deactivation) when a push ' +
          'channel is unavailable. Returns commands the agent must execute on its scanner.',
        pathParams: [{ name: 'deviceId', type: 'string', description: 'Agent id.' }],
        responses: [
          {
            status: 200,
            description: 'Pending commands.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [{ commandId: 'c1...', type: 'DEACTIVATE_TAG', epc: 'E2801170200000000000ABCD' }],
            },
          },
        ],
      },
      {
        id: 'ack-device-command',
        method: 'POST',
        path: '/devices/:deviceId/commands/:commandId/ack',
        title: 'Acknowledge command',
        status: 'planned',
        auth: true,
        description: 'Agent reports the execution result of a command (success/failure) so the middleware can close or retry it.',
        pathParams: [
          { name: 'deviceId', type: 'string', description: 'Agent id.' },
          { name: 'commandId', type: 'string', description: 'Command id.' },
        ],
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'status', type: 'enum(SUCCESS|FAILED)', required: true, description: 'Execution outcome.' },
            { name: 'error', type: 'string', required: false, description: 'Failure detail, if any.' },
          ],
          sample: { status: 'SUCCESS' },
        },
        responses: [{ status: 204, description: 'Acknowledged. Empty body.', sample: null }],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* AUDIT LOGS (planned)                                                */
  /* ------------------------------------------------------------------ */
  {
    id: 'audit-logs',
    name: 'Audit / RFID Transaction Logs',
    blurb:
      'Read access to the five audit log categories from the brief: Tag Read, Transaction Session, POS Integration, ' +
      'Exception Handling, Fallback. Backs compliance review and incident reconstruction.',
    endpoints: [
      {
        id: 'list-audit-logs',
        method: 'GET',
        path: '/audit-logs',
        title: 'Query audit logs',
        status: 'planned',
        auth: true,
        description: 'Paginated, filterable audit trail across the five log categories, with a date range and free-text reference filter.',
        queryParams: [
          { name: 'category', type: 'enum(TAG_READ|TRANSACTION_SESSION|POS_INTEGRATION|EXCEPTION|FALLBACK)', required: false, description: 'Filter by log category.' },
          { name: 'from', type: 'ISO-8601 datetime', required: false, description: 'Start of range.' },
          { name: 'to', type: 'ISO-8601 datetime', required: false, description: 'End of range.' },
          { name: 'reference', type: 'string', required: false, description: 'Match a transaction/session/EPC reference.' },
          { name: 'page', type: 'integer', required: false, default: '1', description: 'Page number.' },
          { name: 'limit', type: 'integer', required: false, default: '10', description: 'Items per page.' },
        ],
        responses: [
          {
            status: 200,
            description: 'Paginated log entries.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: [
                { id: 'l1...', category: 'POS_INTEGRATION', reference: 'ETP-014-20260624-000871', message: 'Sale confirmation received', createdAt: '2026-06-24T10:32:06.000Z' },
              ],
              meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
            },
          },
        ],
      },
    ],
  },
];

// Expose to the renderer (and tolerate a Node/CommonJS context for future tests).
if (typeof window !== 'undefined') {
  window.API_DOCS = { API_INFO, CONVENTIONS, GROUPS };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_INFO, CONVENTIONS, GROUPS };
}
