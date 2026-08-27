const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generatePromotionalEmailHTML,
} = require("../src/templates/promotionalEmailTemplate");

test("generates promotional email with customer and campaign data", () => {
  const html = generatePromotionalEmailHTML({
    firstname: "Ishita",
    lastname: "Roy",
    city: "Kolkata",
    promoCode: "WELCOME20",
    discountPercentage: 20,
    campaignHeadline: "An exclusive welcome offer",
    storeUrl: "https://example.com/promotions",
    expirationDate: "2026-09-02",
  });

  assert.match(html, /Ishita Roy/);
  assert.match(html, /Kolkata/);
  assert.match(html, /WELCOME20/);
  assert.match(html, /20% OFF/);
  assert.match(html, /An exclusive welcome offer/);
  assert.match(html, /September 2, 2026/);
  assert.match(
    html,
    /href="https:\/\/example\.com\/promotions"/
  );
});

test("supports firstName and lastName casing", () => {
  const html = generatePromotionalEmailHTML({
    firstName: "Ishita",
    lastName: "Roy",
  });

  assert.match(html, /Ishita Roy/);
});

test("uses fallback campaign values when data is missing", () => {
  const html = generatePromotionalEmailHTML({
    firstname: "Ishita",
    lastname: "Roy",
  });

  assert.match(html, /Ishita Roy/);
  assert.match(html, /WELCOME20/);
  assert.match(html, /20% OFF/);
  assert.match(html, /An exclusive welcome offer/);
  assert.match(html, /https:\/\/yourwebsite\.com\/promotions/);
});

test("escapes dynamic HTML values", () => {
  const html = generatePromotionalEmailHTML({
    firstname: "<script>alert('x')</script>",
    lastname: "Test",
    city: "<b>Kolkata</b>",
    promoCode: "<PROMO20>",
    campaignHeadline: "<Headline>",
  });

  assert.match(
    html,
    /&lt;script&gt;alert\(&#039;x&#039;\)&lt;\/script&gt;/
  );
  assert.match(html, /&lt;b&gt;Kolkata&lt;\/b&gt;/);
  assert.match(html, /&lt;PROMO20&gt;/);
  assert.match(html, /&lt;Headline&gt;/);

  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<b>Kolkata<\/b>/);
});

test("uses the provided store URL for the CTA", () => {
  const html = generatePromotionalEmailHTML({
    storeUrl: "https://example.com/shop",
  });

  assert.match(
    html,
    /href="https:\/\/example\.com\/shop"/
  );
});

test("uses the provided unsubscribe URL", () => {
  const html = generatePromotionalEmailHTML({
    unsubscribeUrl: "https://example.com/unsubscribe",
  });

  assert.match(
    html,
    /href="https:\/\/example\.com\/unsubscribe"/
  );
});

test("uses expirationDate", () => {
  const html = generatePromotionalEmailHTML({
    expirationDate: "2026-09-02",
  });

  assert.match(html, /September 2, 2026/);
});

test("uses expiresAt as a fallback expiration date", () => {
  const html = generatePromotionalEmailHTML({
    expiresAt: "2026-09-03T00:00:00.000Z",
  });

  assert.match(html, /September 3, 2026/);
});

test("uses a fallback date when the expiration date is invalid", () => {
  const html = generatePromotionalEmailHTML({
    expirationDate: "invalid-date",
  });

  assert.match(html, /Offer expires on/);
  assert.doesNotMatch(html, /Invalid Date/);
});