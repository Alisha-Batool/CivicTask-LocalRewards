import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from '../server/api.ts';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`DEMO BACKEND AUTH TEST FAILED: ${message}`);
}

async function runDemoBackendAuthTest() {
  process.env.VITE_DEMO_MODE = 'true';

  const apiCall = async (url: string, token?: string, body?: string) => {
    let responseBody = '';
    const response = {
      statusCode: 0,
      setHeader: () => undefined,
      end: (value: string) => {
        responseBody = value;
      },
    } as unknown as ServerResponse;
    const request = {
      url,
      method: body === undefined ? 'GET' : 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      socket: { remoteAddress: 'demo-backend-auth-test' },
      on: (event: string, callback: (chunk?: Buffer) => void) => {
        if (event === 'data') callback(Buffer.from(body || '{}'));
        if (event === 'end') callback();
        return request;
      },
    } as unknown as IncomingMessage;

    await handleApiRequest(request, response);
    return { status: response.statusCode, body: JSON.parse(responseBody) as { error?: string } };
  };

  const deniedTestToken = await apiCall('/api/unrecognized', 'test-admin-demo');
  assert(deniedTestToken.status === 401, 'development test tokens are rejected while demo mode is enabled');
  assert(deniedTestToken.body.error?.includes('Unauthorized') === true, 'unauthenticated requests keep the normal API denial');

  const guestAi = await apiCall('/api/ai/match-tasks', undefined, '{}');
  assert(guestAi.status === 400, 'guest AI requests reach schema validation without authentication');

  const guestAdmin = await apiCall('/api/tasks/create', undefined, '{}');
  assert(guestAdmin.status === 401, 'guest task creation remains protected by the API authentication boundary');
  console.log('Demo mode backend authentication boundary test passed.');
}

runDemoBackendAuthTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
