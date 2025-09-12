const request = require('supertest');
const app = require('../server');

describe('Server', () => {
  test('Health check endpoint should return OK', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
    expect(response.body.environment).toBeDefined();
  });

  test('API endpoints should be protected', async () => {
    await request(app)
      .get('/api/dashboard/my-dashboard')
      .expect(401);
  });

  test('Non-existent routes should return 404', async () => {
    await request(app)
      .get('/non-existent-route')
      .expect(404);
  });
});
