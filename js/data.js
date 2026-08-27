/**
 * Geoplan RFID Middleware API Docs reference data.
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
  title: 'GeoPlan RFID Integration Reference',
  subtitle: 'Delivery contracts for ETP POS, Samooha, and the GeoPlan RFID middleware',
  baseUrl: 'https://rfid-middleware.geoplanph.com/api/v1',
  documentStatus: 'FSD review draft',
  documentScope: 'Current scope: master data sync and transaction documents',
  documentNotice:
    'Process flow: Samooha POSTs GRN, CRN, GD, and VRN documents to GeoPlan in batches. ' +
    'A warehouse user picks a document on the GeoPlan app and starts the scan. ' +
    'GeoPlan POSTs scan results back only for GRN. ' +
    'This document is subject to change while the integration contract is being agreed. ' +
    'Items marked “to confirm” are not final requirements. ' +
    'Unresolved discrepancies (this document does not pick a side): ' +
    'the 27 Aug meeting said POST /rfid/gr while the live Samooha OpenAPI is POST /rfid/grn; ' +
    'FSD FR-IN-03 allows scanned quantity 0 when a tag is missing while the live schema has quantity minimum 1; ' +
    'these docs still describe GeoPlan pulling partner GET /api/v1/products while FSD 3.3 says Samooha pushes VPM; ' +
    'the FSD cover is v1.1 while document control is v1.2.',
  documentRevision: 'Revision 0.2 · Updated 28 August 2026',
  goLive: 'October 1, 2026',
  repo: 'ssi-rfid-middleware (NestJS / TypeScript / Prisma / PostgreSQL)',
};

/**
 * Cross-cutting conventions that apply to every endpoint. Rendered once at the
 * top so individual endpoint cards stay focused on their own payloads.
 */
const MASTER_DATA_QUERY_PARAMS = [
  {
    name: 'page',
    type: 'integer',
    required: false,
    default: '1',
    description: 'One-based page number for the filtered result.',
  },
  {
    name: 'limit',
    type: 'integer',
    required: false,
    default: '1000',
    description: 'Maximum records returned per page. The current middleware requests 1000.',
  },
  {
    name: 'updatedAfter',
    type: 'ISO-8601 UTC datetime',
    required: false,
    description: 'Return only records whose updatedAt is later than this checkpoint. Omitted for the initial full load.',
  },
  {
    name: 'includeDeleted',
    type: 'boolean',
    required: false,
    default: 'false',
    description: 'When true, include deleted products as tombstones. GeoPlan sends true during delta syncs.',
  },
];

const MASTER_DATA_PRODUCT_FIELDS = [
  { name: 'id', type: 'string / UUID', required: true, description: 'Stable source-system product identifier.' },
  { name: 'sku', type: 'string', required: true, description: 'Stable business key used for middleware upserts. Treat as immutable.' },
  { name: 'barcode', type: 'string', required: true, description: 'GTIN or barcode used by barcode-mode POS and mapped to gtin in GeoPlan.' },
  { name: 'name', type: 'string', required: true, description: 'Product display name.' },
  { name: 'brand', type: 'string', required: false, description: 'Brand value. Accepted for future mapping; not stored by the current module.' },
  { name: 'category', type: 'string', required: false, description: 'Product category. Accepted for future mapping.' },
  { name: 'department', type: 'string', required: false, description: 'Merchandising department. Accepted for future mapping.' },
  { name: 'size', type: 'string', required: false, description: 'Product size. Accepted for future mapping.' },
  { name: 'color', type: 'string', required: false, description: 'Product color. Accepted for future mapping.' },
  { name: 'costPrice', type: 'number', required: false, description: 'Cost price. Accepted for future mapping.' },
  { name: 'retailPrice', type: 'number', required: false, description: 'Retail price. Accepted for future mapping.' },
  { name: 'season', type: 'string', required: false, description: 'Season or collection code. Accepted for future mapping.' },
  { name: 'supplier', type: 'string', required: false, description: 'Supplier code. Accepted for future mapping.' },
  { name: 'status', type: 'ACTIVE | INACTIVE | DISCONTINUED', required: false, description: 'Current product lifecycle status.' },
  { name: 'isDeleted', type: 'boolean', required: true, description: 'False for active records. True for a deletion tombstone.' },
  { name: 'deletedAt', type: 'ISO-8601 UTC datetime | null', required: true, description: 'Required when isDeleted is true; otherwise null.' },
  { name: 'createdAt', type: 'ISO-8601 UTC datetime', required: true, description: 'Source-system creation time.' },
  { name: 'updatedAt', type: 'ISO-8601 UTC datetime', required: true, description: 'Must advance on every insert, edit, status change, and deletion.' },
];

const MASTER_DATA_META_FIELDS = [
  { name: 'total', type: 'integer', required: true, description: 'Number of records matching the current full or delta filter.' },
  { name: 'catalogTotal', type: 'integer', required: true, description: 'Total products in the complete source catalog before delta filtering.' },
  { name: 'page', type: 'integer', required: true, description: 'Current one-based page.' },
  { name: 'limit', type: 'integer', required: true, description: 'Applied page size.' },
  { name: 'totalPages', type: 'integer', required: true, description: 'Pages in the filtered result, not in the full catalog.' },
  { name: 'hasNext', type: 'boolean', required: true, description: 'Whether another filtered page is available.' },
  { name: 'hasPrev', type: 'boolean', required: true, description: 'Whether a previous filtered page exists.' },
  { name: 'syncTimestamp', type: 'ISO-8601 UTC datetime', required: true, description: 'Source-generated high-water mark for this stable snapshot.' },
];

const MASTER_DATA_ERRORS = [
  { status: '400', when: 'Invalid page, limit, timestamp, or boolean value.', geoPlanBehavior: 'Fail the run and keep the previous checkpoint.' },
  { status: '401 / 403', when: 'Missing, expired, or unauthorized server credential.', geoPlanBehavior: 'Fail the run and alert operations.' },
  { status: '429', when: 'Source rate limit reached, if rate limiting is enabled.', geoPlanBehavior: 'Treat as retryable; exact retry policy is to confirm.' },
  { status: '500–599', when: 'Partner source is temporarily unavailable or cannot complete the query.', geoPlanBehavior: 'Fail the run and keep the previous checkpoint.' },
];

const MASTER_DATA_SAMPLE_RESPONSE = {
  data: [
    {
      id: '8617ebd3-0425-484d-95eb-a5d00f85f630',
      sku: 'ZRA-FOO-OLI-40-036815',
      barcode: '7067600196000',
      name: 'Sport Sandal',
      brand: 'ZRA',
      category: 'Footwear',
      department: 'Men',
      size: '40',
      color: 'Olive',
      costPrice: 74.15,
      retailPrice: 133.48,
      season: 'SS24',
      supplier: 'SUP-CHN-001',
      status: 'ACTIVE',
      isDeleted: false,
      deletedAt: null,
      createdAt: '2024-11-11T21:20:00.283Z',
      updatedAt: '2026-06-28T15:59:25.283Z',
    },
  ],
  meta: {
    total: 10,
    catalogTotal: 100000,
    page: 1,
    limit: 1000,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    syncTimestamp: '2026-06-28T16:00:00.000Z',
  },
};

const CONVENTIONS = [];
const PARTNER_REQUIREMENTS = [];
const GROUPS = [];

document.write('<script src="js/conventions.js"><\/script>');
document.write('<script src="js/p/etp-pos-master-data.js"><\/script>');
document.write('<script src="js/p/samooha-master-data.js"><\/script>');
document.write('<script src="js/g/system.js"><\/script>');
document.write('<script src="js/g/master-data-sync.js"><\/script>');
document.write('<script src="js/g/transaction-documents.js"><\/script>');
document.write('<script src="js/g/epc-scan-processing.js"><\/script>');
document.write('<script src="js/g/rfid-readers.js"><\/script>');
document.write('<script src="js/g/sale-confirmation.js"><\/script>');
document.write('<script src="js/g/tags-epc.js"><\/script>');
document.write('<script src="js/g/inventory-events.js"><\/script>');
document.write('<script src="js/g/exceptions.js"><\/script>');
document.write('<script src="js/g/devices.js"><\/script>');
document.write('<script src="js/g/audit-logs.js"><\/script>');
document.write('<script src="js/g/_close.js"><\/script>');
