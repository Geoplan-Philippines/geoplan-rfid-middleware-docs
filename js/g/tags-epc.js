GROUPS.push(
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
  }
);
