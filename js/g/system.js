GROUPS.push(
{
    id: 'system',
    name: 'System & Health',
    blurb: 'Liveness/readiness probes for the middleware service and its database.',
    endpoints: [
      {
        id: 'health-check',
        method: 'GET',
        path: '/health',
        title: 'Health check',
        status: 'implemented',
        auth: false,
        source: 'src/core/health/health.controller.ts',
        description:
          'Liveness/readiness probe. Runs a Prisma ping against PostgreSQL so an orchestrator ' +
          '(Cloud Run, k8s, load balancer) can tell whether the service AND its database are up. Public, so no API key required.',
        responses: [
          {
            status: 200,
            description: 'Service and database healthy.',
            sample: {
              statusCode: 200,
              message: 'Success',
              data: {
                status: 'ok',
                info: { database: { status: 'up' } },
                error: {},
                details: { database: { status: 'up' } },
              },
            },
          },
        ],
        errors: [
          { status: 503, code: 'ServiceUnavailable', when: 'Database ping fails; body contains the failing indicator under "error".' },
        ],
      },
    ],
  }
);
