GROUPS.push(
{
    id: 'sale-confirmation',
    name: 'Sale Confirmation & Tag Deactivation',
    blurb:
      'POST-SALE relay only, outside the 3,000ms checkout hot path. ETP confirms a completed sale; the ' +
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
          'during active checkout; it runs after the bill is finalised, keeping the hot path GeoPlan-free.',
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
          { status: 409, code: 'Conflict', when: 'Duplicate posTransactionId (already processed); idempotent replay.' },
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
  }
);
