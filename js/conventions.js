CONVENTIONS.push(
{
    title: 'Base URL & versioning',
    body:
      'All routes are served under the global prefix <code>/api</code> with URI versioning, ' +
      'default version <code>v1</code>. The production base URL is ' +
      '<code>https://rfid-middleware.geoplanph.com/api/v1</code> ' +
      '(<em>provisioning in progress — confirm with GeoPlan before go-live</em>). ' +
      'For local development the service runs at <code>http://localhost:8000/api/v1</code>.',
  }
);
CONVENTIONS.push(
{
    title: 'Contract status & changes',
    body:
      'This is a working integration reference. <em>Proposed contract</em> and <em>to confirm</em> items are not final. ' +
      'Once approved, each partner contract should carry a version and change log. Breaking field or behavior changes require a new API version or an agreed migration window.',
  }
);
CONVENTIONS.push(
{
    title: 'Authentication',
    body:
      'Every request must include your API key in the <code>x-api-key</code> request header. ' +
      'Keys are issued by GeoPlan — <em>request a key (or a replacement) from your GeoPlan contact</em>; ' +
      'they are provisioned for you, not self-served. A global guard protects every route except those ' +
      'explicitly marked <em>Public</em> (health check only). Missing or invalid keys return <code>401</code>. ' +
      'Treat your key as a secret: do not embed it in client-side code or commit it to source control.',
  }
);
CONVENTIONS.push(
{
    title: 'Success envelope',
    body:
      'Successful responses are wrapped by a global interceptor:<br>' +
      '<code>{ "statusCode": number, "message": "Success", "data": &lt;payload&gt; }</code>.<br>' +
      'Paginated endpoints additionally hoist a <code>meta</code> object to the top level.',
  }
);
CONVENTIONS.push(
{
    title: 'Error envelope',
    body:
      'Errors are emitted by a global exception filter (NOT wrapped in the success envelope):<br>' +
      '<code>{ "statusCode", "message", "error", "path", "timestamp" }</code>. ' +
      '<code>message</code> may be a string or an array of validation messages.',
  }
);
CONVENTIONS.push(
{
    title: 'Validation',
    body:
      'Request bodies/queries are validated with a strict global pipe ' +
      '(<code>whitelist</code> + <code>forbidNonWhitelisted</code> + <code>transform</code>). ' +
      'Unknown fields are rejected with <code>400</code>.',
  }
);
CONVENTIONS.push(
{
    title: 'Rate limiting',
    body:
      'Global throttle of <strong>100 requests / 60 seconds</strong> per client. ' +
      'Exceeding it returns <code>429 Too Many Requests</code>.',
  }
);
CONVENTIONS.push(
{
    title: 'Pagination',
    body:
      'List endpoints accept <code>page</code> (min 1, default 1) and <code>limit</code> ' +
      '(1–50, default 10). Responses include ' +
      '<code>meta: { total, page, limit, lastPage }</code>.',
  }
);
