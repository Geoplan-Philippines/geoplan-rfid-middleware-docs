GROUPS.push(
{
    id: 'transaction-documents',
    name: 'Transaction Documents',
    blurb:
      'Samooha POSTs GRN, CRN, GD, and VRN documents in batches. A warehouse user picks a document on the GeoPlan app ' +
      'and starts the scan. GeoPlan POSTs scan results back only for GRN. Planned ingest; not built yet.',
    endpoints: [
      {
        id: 'ingest-transaction-documents',
        method: 'POST',
        path: '/transaction-documents',
        title: 'Ingest warehouse documents',
        status: 'planned',
        auth: true,
        description:
          'Samooha posts a batch of warehouse documents (GRN, CRN, GD, and VRN) using one schema. GeoPlan stores them so a ' +
          'warehouse user can pick a document and start an RFID scan. Full route is POST /api/v1/transaction-documents. ' +
          'Auth is the x-api-key header. This is the Samooha ingest; it is not /scan-activities (superadmin catalog of code/name). ' +
          'Scan results are posted back to Samooha only for GRN — see the Samooha partner block, live spec POST /rfid/grn.',
        requestBody: {
          contentType: 'application/json',
          fields: [
            { name: 'documents', type: 'object[]', required: true, description: 'Batch of warehouse documents. Samooha may send more than one document in one call. One schema covers GRN, CRN, GD, and VRN.' },
            { name: 'documents[].activity', type: 'enum(GRN|CRN|GD|VRN)', required: true, description: 'Document type. One schema covers all four activities.' },
            { name: 'documents[].documentNumber', type: 'string', required: true, description: 'Unique document id. FSD v1.2 §7: PI Doc # (GRN), CN Doc # (CRN), SO Doc # (GD), DN Doc # (VRN).' },
            { name: 'documents[].documentReference', type: 'string', required: true, description: 'Warehouse-facing reference. FSD v1.2 §7: PI/CN/SO/DN Ref #.' },
            { name: 'documents[].partnerName', type: 'string', required: true, description: 'Vendor Name for GRN and VRN; Customer Name for CRN and GD.' },
            { name: 'documents[].warehouseCode', type: 'string', required: true, description: 'Warehouse Code from the source document.' },
            { name: 'documents[].lines', type: 'object[]', required: true, description: 'Expected scan lines. One line per SKU. There is no lineNumber field.' },
            { name: 'documents[].lines[].sku', type: 'string', required: true, description: 'SKU to scan. Samooha consolidates same-SKU lines before send.' },
            { name: 'documents[].lines[].quantity', type: 'number', required: true, description: 'Expected quantity to scan. This is not the scanned quantity.' },
          ],
          sample: {
            documents: [
              {
                activity: 'GRN',
                documentNumber: 'PI-26084567',
                documentReference: 'ASN-8891',
                partnerName: 'On Running - SSI',
                warehouseCode: 'WH01',
                lines: [{ sku: 'RP80282244', quantity: 100 }],
              },
            ],
          },
        },
        responses: [
          {
            status: 202,
            description: 'Batch accepted for ingest into scan activities (planned; not built yet).',
            sample: {
              statusCode: 202,
              message: 'Success',
              data: { accepted: 1 },
            },
          },
        ],
        errors: [
          { status: 400, code: 'BadRequest', when: 'Missing documents, unknown activity, missing required fields, or extra fields (strict whitelist).' },
          { status: 401, code: 'Unauthorized', when: 'Missing/invalid x-api-key.' },
        ],
        notes: [
          'Planned until ACE-59 is built. Not implemented in this repo today.',
          'documents is an array. Samooha may send more than one document in one call. One schema covers GRN, CRN, GD, and VRN.',
          'Do not send lineNumber. Samooha consolidates same-SKU lines before send; GeoPlan is guaranteed one line per SKU per document.',
          'lines.quantity is the expected scan quantity, not the scanned quantity.',
          'This is the Samooha ingest route. It is not /scan-activities (that path is the superadmin catalog of code/name).',
          'GeoPlan POSTs scan results back only for GRN, using the live Samooha spec POST /rfid/grn with body { documentRef, lines: [{ sku, quantity }] }, header X-API-KEY, success 204. See the Samooha partner block and https://rmk.samooha.com/docs/v1/.',
          'Unresolved (not decided here): 27 Aug meeting said POST /rfid/gr; live OpenAPI is POST /rfid/grn.',
          'Unresolved (not decided here): FSD FR-IN-03 scanned quantity 0 vs live quantity minimum 1.',
          'Unresolved (not decided here): these docs still describe GeoPlan pulling GET /api/v1/products vs FSD 3.3 Samooha pushes VPM.',
          'Unresolved (not decided here): FSD cover v1.1 vs document control v1.2.',
        ],
      },
    ],
  }
);
