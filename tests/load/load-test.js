import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = 'http://api-gateway:4003';

export default function () {
  // 1. Browse Products
  let productRes = http.get(`${BASE_URL}/api/products`);
  check(productRes, {
    'status is 200': (r) => r.status === 200,
    'has products': (r) => r.json().length > 0,
  });

  // Pick a random product if available
  const products = productRes.json();
  if (products && products.length > 0) {
    const product = randomItem(products);
    const productId = product.id || product._id;

    sleep(1);

    // 2. Add to Cart
    let cartPayload = JSON.stringify({
      productId: productId,
      quantity: 1,
      userId: 'test-user-123'
    });

    let cartRes = http.post(`${BASE_URL}/api/cart`, cartPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(cartRes, {
      'added to cart': (r) => r.status === 200 || r.status === 201,
    });

    sleep(2);

    // 3. Create Order
    let orderPayload = JSON.stringify({
      userId: 'test-user-123',
      items: [{ productId: productId, quantity: 1 }],
      totalAmount: product.price || 100
    });

    let orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(orderRes, {
      'order created': (r) => r.status === 200 || r.status === 201,
    });
  }

  sleep(1);
}
