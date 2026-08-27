GROUPS.push(
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
  }
);
