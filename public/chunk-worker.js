// File slicing runs here so reads and header assembly do not compete with UI work.
const HEADER_BYTES = 14;
let files = [], cursor = 0;
self.onmessage = async ({ data }) => {
  if (data.type === 'files') { files = data.files; cursor = 0; return; }
  if (data.type !== 'next') return;
  while (cursor < files.length && files[cursor].offset >= files[cursor].file.size) cursor++;
  if (cursor >= files.length) return postMessage({ type: 'done' });
  const item = files[cursor], length = Math.min(data.chunkSize, item.file.size - item.offset);
  const payload = await item.file.slice(item.offset, item.offset + length).arrayBuffer();
  const out = new ArrayBuffer(HEADER_BYTES + length), view = new DataView(out);
  view.setUint16(0, item.id); view.setBigUint64(2, BigInt(item.offset)); view.setUint32(10, length);
  new Uint8Array(out, HEADER_BYTES).set(new Uint8Array(payload));
  item.offset += length;
  postMessage({ type: 'chunk', buffer: out, bytes: length }, [out]);
};
