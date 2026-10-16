const { test, expect } = require('@playwright/test');

const appOrigin = 'http://127.0.0.1:4173';

for (const route of ['/prepare.html', '/nr.html']) {
  test(`${route} does not make external requests or store browser data`, async ({ page }) => {
    const externalRequests = [];
    page.on('request', request => {
      if (new URL(request.url()).origin !== appOrigin) externalRequests.push(request.url());
    });

    const response = await page.goto(`${appOrigin}${route}`);
    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    const html = await response.text();
    const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(['"])(.*?)\1/gi)]
      .map(match => match[2]);
    expect(scriptSources.filter(source => new URL(source, appOrigin).origin !== appOrigin)).toEqual([]);

    expect(externalRequests).toEqual([]);
    expect(await page.evaluate(() => ({
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      cookies: document.cookie
    }))).toEqual({ localStorage: 0, sessionStorage: 0, cookies: '' });
  });
}
