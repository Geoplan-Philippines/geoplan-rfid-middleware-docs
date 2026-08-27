GROUPS.push(
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
        status: 'implemented',
        auth: true,
        source: 'src/modules/epc-scan-processing/epc-scan-processing.controller.ts',
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
        status: 'implemented',
        auth: true,
        source: 'src/modules/epc-scan-processing/epc-scan-processing.controller.ts',
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
  }
);
