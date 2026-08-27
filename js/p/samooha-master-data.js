PARTNER_REQUIREMENTS.push(
{
    id: 'samooha-master-data',
    partner: 'Samooha',
    title: 'Expose product master data to GeoPlan',
    purpose:
      'GeoPlan needs the Samooha product master so Samooha product records and RFID EPC reads resolve to the same SKU. ' +
      'GeoPlan stores a separate local copy and adds EPC/TID associations in the RFID layer; Samooha does not need to add EPC fields to its product model for this phase.',
    operatingPlan: [
      { label: 'Samooha owns', value: 'The hosted product endpoint, source data accuracy, authentication credentials, and availability.' },
      { label: 'GeoPlan owns', value: 'Calling the endpoint, storing the local copy, maintaining the successful checkpoint, and attaching EPC/TID data.' },
      { label: 'Initial load', value: 'GeoPlan calls the endpoint without updatedAfter and imports the complete Samooha catalog.' },
      { label: 'Nightly plan', value: 'Proposed: GeoPlan runs a cron job every day at 00:00 Asia/Manila and requests only records changed after the last successful checkpoint.' },
      { label: 'No-change run', value: 'Return an empty data array, total 0, catalogTotal for the full catalog, and a new syncTimestamp.' },
      { label: 'Failure behavior', value: 'GeoPlan does not advance the checkpoint after a failed run. The same delta range is requested again on the next run.' },
      { label: 'GRN result posting', value: 'After a warehouse GRN scan, GeoPlan POSTs scan results to Samooha. CRN, GD, and VRN are ingested for scanning on the GeoPlan app; GeoPlan does not POST scan results back for those types.' },
      { label: 'Live GRN endpoint', value: 'POST /rfid/grn. Body { documentRef, lines: [{ sku, quantity }] }. Header X-API-KEY. Success 204. Published spec: https://rmk.samooha.com/docs/v1/.' },
    ],
    endpoint: {
      method: 'GET',
      path: '/api/v1/products',
      description:
        'Samooha hosts this read-only endpoint. Filtering must happen in the Samooha database before pagination so a 100,000-product catalog with 10 changes returns only those 10 records.',
      connection: [
        { label: 'Base URL', value: 'Provided by Samooha for each environment; to confirm.' },
        { label: 'Transport', value: 'HTTPS only.' },
        { label: 'Authentication', value: 'Server-to-server authentication method and credential rotation process; to confirm with Samooha.' },
        { label: 'Ordering', value: 'Stable ascending order by updatedAt, then id, for the duration of one snapshot.' },
        { label: 'Snapshot rule', value: 'All pages in one run use the same syncTimestamp cutoff. Changes after that cutoff appear in the next run.' },
        { label: 'Recommended index', value: 'Database index on updatedAt, with id as the tie-breaker where supported.' },
      ],
      queryParams: MASTER_DATA_QUERY_PARAMS,
      productFields: MASTER_DATA_PRODUCT_FIELDS,
      metaFields: MASTER_DATA_META_FIELDS,
      errors: MASTER_DATA_ERRORS,
      sampleRequest:
        'GET https://<samooha-base-url>/api/v1/products?page=1&limit=1000&updatedAfter=2026-06-27T16%3A00%3A00.000Z&includeDeleted=true\n' +
        '<agreed-authentication-header>: <credential>',
      sampleResponse: MASTER_DATA_SAMPLE_RESPONSE,
    },
    deliveryChecklist: [
      'Provide development/UAT and production base URLs plus test credentials.',
      'Apply updatedAfter and includeDeleted in the source database before calculating pagination.',
      'Keep SKU stable. A SKU rename must emit a deletion for the old SKU and a new record for the replacement SKU.',
      'Advance updatedAt for every data mutation, including status changes and soft deletion.',
      'Retain deletion tombstones long enough to cover the agreed maximum middleware outage window.',
      'Return one stable snapshot across every page and an authoritative syncTimestamp checkpoint.',
      'Pass acceptance cases for full load, no changes, 10 changes in a 100,000-item catalog, deletion, multiple delta pages, and temporary failure.',
      'Name a technical owner for contract changes and production incidents.',
    ],
    openItems: [
      'Final base URLs for development/UAT and production.',
      'Authentication method, credential issuance, and credential rotation.',
      'Network allowlisting or private connectivity requirements.',
      'Rate limits, timeout target, maintenance windows, and availability expectation.',
      'Deletion-tombstone retention period.',
      'Whether the production contract will use a sequence/composite cursor instead of timestamp-only filtering.',
      'Final mapping and required status values for optional merchandise fields.',
      'Unresolved: 27 Aug meeting said POST /rfid/gr; live Samooha OpenAPI is POST /rfid/grn (https://rmk.samooha.com/docs/v1/api-docs.json). This document does not pick a side.',
      'Unresolved: FSD FR-IN-03 allows scanned quantity 0 when a tag is missing; live schema has quantity minimum 1. This document does not pick a side.',
      'Unresolved: these docs still describe GeoPlan pulling master data via partner GET /api/v1/products; FSD 3.3 says Samooha pushes VPM (CSV at go-live, then API on changes). This document does not pick a side.',
      'Unresolved: FSD cover says v1.1 dated 27 Aug; document control says v1.2 dated 26/27 Aug. This document does not pick a side.',
    ],
  }
);
