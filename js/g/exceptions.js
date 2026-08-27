GROUPS.push(
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
        status: 'implemented',
        auth: true,
        source: 'src/modules/exception-handling/exception-handling.controller.ts',
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
        status: 'implemented',
        auth: true,
        source: 'src/modules/exception-handling/exception-handling.controller.ts',
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
        status: 'implemented',
        auth: true,
        source: 'src/modules/exception-handling/exception-handling.controller.ts',
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
  }
);
