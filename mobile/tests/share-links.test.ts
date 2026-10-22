import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanUrl, firstLink, hintFromText, splitSharePayloads } from '../src/features/share-import/links.ts';
import { productFacts } from '../src/features/saved/types.ts';

const text = (value: string, shareType = 'text') => ({ value, shareType, mimeType: 'text/plain' });

test('a product shared from a shopping app becomes a link plus the words shared with it', () => {
  const { links, textWithoutLink, rest } = splitSharePayloads([text('Check out Roadster Men Navy T-shirt at ₹499 on Flipkart https://fkrt.it/abc123')]);
  assert.deepEqual(links, [{ url: 'https://fkrt.it/abc123', hint: 'Roadster Men Navy T-shirt at ₹499 on Flipkart' }]);
  assert.equal(textWithoutLink, 0);
  assert.deepEqual(rest, []);
});

test('the link comes first or last in the message, or is the whole message', () => {
  assert.equal(splitSharePayloads([text('https://amzn.in/d/0aB1cD2e Samsung 55 inch Smart TV')]).links[0].url, 'https://amzn.in/d/0aB1cD2e');
  assert.equal(splitSharePayloads([text('Look at this https://www.myntra.com/dresses/h-m/p/123/buy')]).links[0].url, 'https://www.myntra.com/dresses/h-m/p/123/buy');
  const only = splitSharePayloads([text('https://www.ajio.com/p/469123456_blue', 'url')]);
  assert.deepEqual(only.links, [{ url: 'https://www.ajio.com/p/469123456_blue', hint: null }]);
});

test('punctuation stuck to the end of a link is not part of it', () => {
  assert.equal(firstLink('See (https://meesho.com/s/p/2ab3c).'), 'https://meesho.com/s/p/2ab3c');
  assert.equal(firstLink('Buy it: https://amzn.in/d/x1y2z3!'), 'https://amzn.in/d/x1y2z3');
});

test('only web links are taken: no other schemes, no bare words, no credentials, nothing absurdly long', () => {
  assert.equal(cleanUrl('javascript:alert(1)'), null);
  assert.equal(cleanUrl('intent://scan/#Intent;scheme=zxing;end'), null);
  assert.equal(cleanUrl('ftp://example.com/file'), null);
  assert.equal(cleanUrl('http://localhost/admin'), null); // no dot in the host
  assert.equal(cleanUrl('https://user:pass@example.com/'), null);
  assert.equal(cleanUrl(`https://example.com/${'a'.repeat(3000)}`), null);
  assert.equal(cleanUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(firstLink('no link here, just words'), null);
});

test('screenshots are left alone for the payment path, and text without a link is counted', () => {
  const image = { value: 'content://a/1', shareType: 'image', mimeType: 'image/png' };
  const { links, textWithoutLink, rest } = splitSharePayloads([image, text('Great deal, buy now!'), text('   ')]);
  assert.equal(links.length, 0);
  assert.equal(textWithoutLink, 1); // the blank one is nothing, not "text without a link"
  assert.deepEqual(rest, [image]);
});

test('the same link twice in one share is one link; a share with two links keeps both in order', () => {
  const same = splitSharePayloads([text('a https://amzn.in/d/aaa'), text('b https://amzn.in/d/aaa')]);
  assert.equal(same.links.length, 1);
  const two = splitSharePayloads([text('https://amzn.in/d/aaa'), text('https://fkrt.it/bbb')]);
  assert.deepEqual(two.links.map((l) => l.url), ['https://amzn.in/d/aaa', 'https://fkrt.it/bbb']);
});

test('malformed input never throws', () => {
  for (const input of [undefined, null, 'x', 42, {}, [null, undefined, 3, 'https://x.com', {}, { value: 5, shareType: 'text' }, { shareType: 'text' }]]) {
    assert.doesNotThrow(() => splitSharePayloads(input));
  }
  assert.deepEqual(splitSharePayloads(undefined), { links: [], textWithoutLink: 0, rest: [] });
});

test('the hint drops the opener, the link and stray punctuation, and is capped', () => {
  assert.equal(hintFromText('Check out this: Boat Airdopes 141 https://amzn.in/d/q', 'https://amzn.in/d/q'), 'Boat Airdopes 141');
  assert.equal(hintFromText('Hey, check this out - Levis 511 Jeans | https://x.com/p', 'https://x.com/p'), 'Levis 511 Jeans');
  assert.equal(hintFromText('https://x.com/p', 'https://x.com/p'), null);
  assert.equal(hintFromText('!! https://x.com/p ...', 'https://x.com/p'), null);
  const long = hintFromText(`${'word '.repeat(100)}https://x.com/p`, 'https://x.com/p');
  assert.ok(long && long.length <= 160 && long.endsWith('…'));
});

test('product facts read a saved item and a link that is only previewed', () => {
  assert.deepEqual(productFacts({ category: 'Electronics', price: 2499, currency: 'INR', store: 'amazon' }), {
    category: 'Electronics',
    price: 2499,
    currency: 'INR',
    store: 'amazon',
  });
  const previewed = { product: { price: '1,299', currency: 'INR', store: 'myntra' }, classification: { module: 'fashion', category: 'tops' } };
  assert.equal(productFacts(previewed, 'fashion').category, null); // a Fashion item has a Fashion category, not a Saved one
  assert.equal(productFacts(previewed, 'saved').category, 'Fashion'); // ...and if it is filed under Saved anyway, it says so
  assert.equal(productFacts(previewed).price, 1299);
  assert.equal(productFacts({ product: { price: '0' } }).price, null);
  assert.equal(productFacts({ classification: { module: 'saved', category: 'Appliances' } }, 'saved').category, 'Appliances');
  assert.deepEqual(productFacts(null), { category: null, price: null, currency: 'INR', store: null });
});
