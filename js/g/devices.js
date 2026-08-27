GROUPS.push(
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
  }
);
