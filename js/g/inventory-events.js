GROUPS.push(
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
          { status: 422, code: 'UnprocessableEntity', when: 'EPCs cannot be resolved to SKUs; routed to exceptions.' },
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
  }
);
