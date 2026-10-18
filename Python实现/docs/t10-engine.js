// MDL1, ported from toys/t10_mdl.py. Only Unicode scalar-value strings are
// accepted: TextEncoder cannot round-trip isolated UTF-16 surrogate code units.
export const MAX_PERIOD = 16;
export const MAX_INTEGER = (1n << 63n) - 1n;
export const DEFAULT_DECODE_LIMIT = 1_000_000;
export const MAX_UI_CODEPOINTS = 4096;
const utf8Encoder = new TextEncoder();
// ignoreBOM=true means preserve U+FEFF, including at the start of every field.
const utf8Decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
const MAGIC = Uint8Array.of(0x4d, 0x44, 0x4c, 0x31);
export class CodecError extends Error { constructor(message) { super(message); this.name = 'CodecError'; } }

export function codePoints(text) {
  if (typeof text !== 'string') throw new TypeError('输入必须是字符串');
  const chars = Array.from(text);
  for (const char of chars) {
    const code = char.codePointAt(0);
    if (code >= 0xd800 && code <= 0xdfff) throw new CodecError('浏览器版不支持孤立 UTF-16 代理项，请使用完整 Unicode 字符');
  }
  return chars;
}
export function utf8(text) { codePoints(text); return utf8Encoder.encode(text); }
function decodeUtf8(bytes) {
  try { return utf8Decoder.decode(bytes); }
  catch { throw new CodecError('不是合法的 UTF-8 字节序列（含孤立代理码点时也会拒绝）'); }
}
export function uvarint(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new RangeError('整数必须精确、非负且在 63 位范围内');
    value = BigInt(value);
  }
  if (typeof value !== 'bigint' || value < 0n || value > MAX_INTEGER) throw new RangeError('整数超出 63 位无符号格式范围');
  const out = [];
  while (value >= 128n) { out.push(Number(value & 127n) | 128); value >>= 7n; }
  out.push(Number(value));
  return Uint8Array.from(out);
}
function concat(parts) {
  const out = new Uint8Array(parts.reduce((sum, item) => sum + item.length, 0));
  let offset = 0;
  for (const item of parts) { out.set(item, offset); offset += item.length; }
  return out;
}
class Reader {
  constructor(blob) { this.blob = blob; this.offset = 0; }
  take(size) {
    if (!Number.isSafeInteger(size) || size < 0 || size > this.blob.length - this.offset) throw new CodecError('字节流被截断，或字段长度无效');
    const start = this.offset; this.offset += size;
    return this.blob.subarray(start, this.offset);
  }
  integer() {
    let value = 0n;
    for (let i = 0; i < 9; i++) {
      const byte = this.take(1)[0];
      value |= BigInt(byte & 127) << BigInt(7 * i);
      if (byte < 128) {
        if (i > 0 && byte === 0) throw new CodecError('整数不是规范的最短 varint 表示');
        return value;
      }
    }
    throw new CodecError('整数超出 63 位格式范围');
  }
  size() {
    const value = this.integer();
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new CodecError('长度超过浏览器可精确处理的整数范围');
    return Number(value);
  }
  finish() { if (this.offset !== this.blob.length) throw new CodecError('完整帧后存在多余字节'); }
}
function makeCandidate(name, period, parts, headerBytes, modelBytes, residualBytes, entries, pattern) {
  const blob = concat(parts);
  return {name, period, blob, total_bytes: blob.length, header_bytes: headerBytes,
    model_bytes: modelBytes, residual_bytes: residualBytes, exceptions: entries.length,
    pattern, entries};
}
export function literalCandidate(text) {
  const payload = utf8(text);
  const header = concat([MAGIC, Uint8Array.of(0x4c), uvarint(payload.length)]);
  return makeCandidate('literal', null, [header, payload], header.length, 0, payload.length, [], null);
}
function periodicCandidate(chars, period) {
  const patternChars = [];
  for (let offset = 0; offset < period; offset++) {
    const counts = new Map();
    for (let pos = offset; pos < chars.length; pos += period) counts.set(chars[pos], (counts.get(chars[pos]) || 0) + 1);
    let best = null, count = -1;
    for (const [char, frequency] of counts) {
      if (frequency > count || (frequency === count && char.codePointAt(0) < best.codePointAt(0))) { best = char; count = frequency; }
    }
    patternChars.push(best);
  }
  const pattern = patternChars.join('');
  const entries = [];
  for (let position = 0; position < chars.length; position++) {
    if (chars[position] !== patternChars[position % period]) entries.push({position, char: chars[position]});
  }
  const patternBytes = utf8Encoder.encode(pattern);
  const prefix = concat([MAGIC, Uint8Array.of(0x52), uvarint(chars.length)]);
  const model = concat([uvarint(patternBytes.length), patternBytes]);
  const count = uvarint(entries.length);
  const residualParts = [];
  for (const {position, char} of entries) {
    const bytes = utf8Encoder.encode(char);
    residualParts.push(uvarint(position), uvarint(bytes.length), bytes);
  }
  const residual = concat(residualParts);
  return makeCandidate(`rule-p${period}`, period, [prefix, model, count, residual],
    prefix.length + count.length, model.length, residual.length, entries, pattern);
}
export function candidateEncodings(text) {
  const chars = codePoints(text);
  const candidates = [literalCandidate(text)];
  for (let period = 1; period <= Math.min(MAX_PERIOD, chars.length); period++) candidates.push(periodicCandidate(chars, period));
  return candidates;
}
export function chooseCandidate(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) throw new RangeError('候选列表不能为空');
  // Strictly smaller: ties preserve literal, then ascending period order.
  return candidates.reduce((best, candidate) => candidate.total_bytes < best.total_bytes ? candidate : best);
}
export function selectCandidate(text) { return chooseCandidate(candidateEncodings(text)); }
export function encode(text) { return selectCandidate(text).blob; }
export function decode(blob, {maxOutputChars = DEFAULT_DECODE_LIMIT} = {}) {
  if (!(blob instanceof Uint8Array)) throw new TypeError('解码输入必须是 Uint8Array');
  if (!Number.isSafeInteger(maxOutputChars) || maxOutputChars < 0) throw new RangeError('解码上限必须是非负安全整数');
  const reader = new Reader(blob);
  if (!reader.take(4).every((byte, index) => byte === MAGIC[index])) throw new CodecError('不是 MDL1 格式或版本未知');
  const mode = reader.take(1)[0];
  if (mode === 0x4c) {
    const text = decodeUtf8(reader.take(reader.size()));
    reader.finish();
    if (Array.from(text).length > maxOutputChars) throw new CodecError('还原文本超过设定的码点上限');
    return text;
  }
  if (mode !== 0x52) throw new CodecError('未知的编码模式');
  const length = reader.size();
  if (length === 0) throw new CodecError('周期规则的输出不能为空');
  if (length > maxOutputChars) throw new CodecError('还原文本超过设定的码点上限');
  const pattern = Array.from(decodeUtf8(reader.take(reader.size())));
  if (pattern.length < 1 || pattern.length > Math.min(MAX_PERIOD, length)) throw new CodecError('周期模型长度无效');
  const count = reader.size();
  if (count > length) throw new CodecError('例外数超过输出长度');
  const entries = [];
  let previous = -1;
  for (let i = 0; i < count; i++) {
    const position = reader.size();
    if (position <= previous || position >= length) throw new CodecError('例外位置必须递增且位于输出范围内');
    const chars = Array.from(decodeUtf8(reader.take(reader.size())));
    if (chars.length !== 1) throw new CodecError('每条例外必须恰好包含一个 Unicode 码点');
    if (chars[0] === pattern[position % pattern.length]) throw new CodecError('例外不能与模式原字符相同');
    entries.push({position, char: chars[0]}); previous = position;
  }
  reader.finish();
  // Fully validate the stream before expanding the periodic model.
  const chars = Array.from({length}, (_, position) => pattern[position % pattern.length]);
  for (const {position, char} of entries) chars[position] = char;
  return chars.join('');
}
export function toHex(blob) { return Array.from(blob, byte => byte.toString(16).padStart(2, '0')).join(' '); }
export function fromHex(text) {
  if (typeof text !== 'string' || !/^(?:\s*[\da-fA-F]{2})*\s*$/.test(text)) throw new CodecError('请输入完整的十六进制字节，每个字节两位，可用空格或换行分隔');
  return Uint8Array.from(text.match(/[\da-fA-F]{2}/g) || [], hex => Number.parseInt(hex, 16));
}
export function analyze(text) {
  const candidates = candidateEncodings(text), selected = chooseCandidate(candidates);
  return {candidates, selected, codepoints: codePoints(text).length, raw_bytes: utf8(text).length,
    restored: decode(selected.blob, {maxOutputChars: codePoints(text).length})};
}
// The Python API spellings are available for direct comparison.
export {candidateEncodings as candidate_encodings, selectCandidate as select_candidate, literalCandidate as literal_candidate};
