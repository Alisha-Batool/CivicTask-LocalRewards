import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from '../server/api.ts';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`DEMO BACKEND AUTH TEST FAILED: ${message}`);
}

async function runDemoBackendAuthTest() {
  process.env.VITE_DEMO_MODE = 'true';
  let responseBody = '';
  const response = {
    statusCode: 0,
    setHeader: () => undefined,
    end: (value: string) => {
      responseBody = value;
    },
  } as unknown as ServerResponse;
  const request = {
    url: '/api/unrecognized',
    method: 'GET',
    headers: { authorization: 'Bearer test-admin-fabricated' },
    socket: { remoteAddress: 'demo-backend-auth-test' },
  } as unknown as IncomingMessage;

  await handleApiRequest(request, response);
  assert(response.statusCode === 401, 'development test tokens are rejected while demo mode is enabled');
  assert(JSON.parse(responseBody).error.includes('Unauthorized'), 'unauthenticated requests keep the normal API denial');
  console.log('Demo mode backend authentication boundary test passed.');
}

runDemoBackendAuthTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
