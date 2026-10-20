import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_ITEMS_PER_SHARE, classifyPayloads, isOwnProvider, totalRejected } from '../src/features/share-import/accept.ts';
import { sniffImage } from '../src/features/share-import/sniff.ts';

const own = 'com.aura360.app';
const image = (value: string, mimeType = 'image/png') => ({ value, shareType: 'image', mimeType });

test('a screenshot from a payment app is accepted', () => {
  const { accepted, rejected } = classifyPayloads([image('content://com.phonepe.app.fileprovider/shared/receipt.png')], { ownPackage: own });
  assert.deepEqual(accepted, [{ sourceUri: 'content://com.phonepe.app.fileprovider/shared/receipt.png', mimeType: 'image/png' }]);
  assert.equal(totalRejected(rejected), 0);
});

test('several screenshots in one share are all accepted, in order', () => {
  const { accepted } = classifyPayloads(
    [image('content://a/1'), image('content://a/2', 'image/jpeg'), image('content://a/3', 'image/webp')],
    { ownPackage: own },
  );
  assert.deepEqual(
    accepted.map((a) => [a.sourceUri, a.mimeType]),
    [
      ['content://a/1', 'image/png'],
      ['content://a/2', 'image/jpeg'],
      ['content://a/3', 'image/webp'],
    ],
  );
});

test('image/jpg is normalised and a MIME type with parameters or capitals still matches', () => {
  const { accepted } = classifyPayloads([image('content://a/1', 'image/jpg'), image('content://a/2', 'IMAGE/PNG; charset=binary')], { ownPackage: own });
  assert.deepEqual(accepted.map((a) => a.mimeType), ['image/jpeg', 'image/png']);
});

test('only content:// addresses are accepted (file://, http and the like are refused)', () => {
  const { accepted, rejected } = classifyPayloads(
    [image('file:///sdcard/Download/a.png'), image('https://example.com/a.png'), image('/data/user/0/com.aura360.app/files/a.png'), image('javascript:alert(1)')],
    { ownPackage: own },
  );
  assert.equal(accepted.length, 0);
  assert.equal(rejected.unsafe, 4);
});

test("Aura360's own file providers are refused, so a crafted share cannot make the app read its own files", () => {
  const { accepted, rejected } = classifyPayloads(
    [
      image('content://com.aura360.app.SharingFileProvider/cache/secret.png'),
      image('content://com.aura360.app.provider/files/x.png'),
      image('content://10@com.aura360.app.fileprovider/x.png'), // per-user form of the same address
      image('content://COM.AURA360.APP.PROVIDER/x.png'),
    ],
    { ownPackage: own },
  );
  assert.equal(accepted.length, 0);
  assert.equal(rejected.unsafe, 4);
  assert.equal(isOwnProvider('content://com.aura360.app/x', own), true);
  // Another app whose name merely starts the same is not ours.
  assert.equal(isOwnProvider('content://com.aura360.apprentice.provider/x', own), false);
  assert.equal(isOwnProvider('content://media/external/images/media/12', own), false);
});

test('anything that is not a JPEG, PNG or WebP image is turned away as unsupported', () => {
  const { accepted, rejected } = classifyPayloads(
    [
      image('content://a/1', 'application/pdf'),
      image('content://a/2', 'image/gif'),
      image('content://a/3', 'image/svg+xml'),
      image('content://a/4', 'image/heic'),
      image('content://a/5', '*/*'),
      image('content://a/6', ''),
      { value: 'content://a/7', shareType: 'video', mimeType: 'video/mp4' },
      { value: 'content://a/8', shareType: 'text', mimeType: 'text/plain' },
    ],
    { ownPackage: own },
  );
  assert.equal(accepted.length, 0);
  assert.equal(rejected.unsupported, 8);
});

test('missing, empty or malformed entries never throw and are counted as unsupported', () => {
  const { accepted, rejected } = classifyPayloads([null, undefined, 42, 'content://a/1', {}, { value: '' }, { value: '   ' }, { value: 5 }, []], { ownPackage: own });
  assert.equal(accepted.length, 0);
  assert.equal(rejected.unsupported, 9);
});

test('nothing shared is not a rejection, but a payload that is not a list is', () => {
  assert.equal(totalRejected(classifyPayloads(undefined, { ownPackage: own }).rejected), 0);
  assert.equal(totalRejected(classifyPayloads(null, { ownPackage: own }).rejected), 0);
  assert.equal(totalRejected(classifyPayloads([], { ownPackage: own }).rejected), 0);
  assert.equal(classifyPayloads('content://a/1', { ownPackage: own }).rejected.unsupported, 1);
  assert.equal(classifyPayloads({ value: 'content://a/1' }, { ownPackage: own }).accepted.length, 0);
});

test('the same address twice in one share is one screenshot', () => {
  const { accepted, rejected } = classifyPayloads([image('content://a/1'), image('content://a/1'), image('content://a/2')], { ownPackage: own });
  assert.equal(accepted.length, 2);
  assert.equal(totalRejected(rejected), 0);
});

test('a share is capped, and the rest are counted rather than silently dropped', () => {
  const many = Array.from({ length: MAX_ITEMS_PER_SHARE + 3 }, (_, i) => image(`content://a/${i}`));
  const { accepted, rejected } = classifyPayloads(many, { ownPackage: own });
  assert.equal(accepted.length, MAX_ITEMS_PER_SHARE);
  assert.equal(rejected.tooMany, 3);
});

test('accepted and refused files in one share are sorted independently', () => {
  const { accepted, rejected } = classifyPayloads([image('content://a/1'), image('content://a/2', 'application/pdf'), image('file:///x.png')], { ownPackage: own });
  assert.equal(accepted.length, 1);
  assert.deepEqual(rejected, { unsupported: 1, unsafe: 1, tooMany: 0 });
});

// ── what a file really is ──────────────────────────────────────────────────────────────────────────────────────

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

test('sniffImage recognises JPEG, PNG and WebP by their first bytes', () => {
  assert.equal(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46)), 'image/jpeg');
  assert.equal(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13)), 'image/png');
  assert.equal(sniffImage(bytes(...ascii('RIFF'), 0x24, 0x08, 0, 0, ...ascii('WEBP'), ...ascii('VP8 '))), 'image/webp');
});

test('sniffImage refuses everything else, whatever the sender claimed', () => {
  assert.equal(sniffImage(bytes()), null);
  assert.equal(sniffImage(bytes(0xff, 0xd8)), null); // truncated
  assert.equal(sniffImage(bytes(...ascii('%PDF-1.7'))), null);
  assert.equal(sniffImage(bytes(...ascii('GIF89a'))), null);
  assert.equal(sniffImage(bytes(...ascii('SQLite format 3\0'))), null); // an app database is not a screenshot
  assert.equal(sniffImage(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE'))), null); // RIFF, but audio
  assert.equal(sniffImage(bytes(...ascii('<svg xmlns='))), null);
});
