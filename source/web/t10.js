import {analyze, decode, fromHex, toHex, codePoints, utf8, uvarint, MAX_UI_CODEPOINTS} from './t10-engine.js';
// Exact preset texts from the original Python seed-42 output. No browser RNG.
const PRESETS = {
  "repeat": {
    "text": "ABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAB",
    "note": "256 个码点、256 个裸字节；规则与完整协议开销一共 11 字节。"
  },
  "short": {
    "text": "ABABABAB",
    "note": "8 个裸字节，规则帧 10 字节：胜过字面量帧，仍比裸数据长。"
  },
  "exception": {
    "text": "ABABABAC",
    "note": "模式 AB 加位置 7 的一个例外，真实帧共 13 字节。"
  },
  "four": {
    "text": "ABABABABABABABABABABABABABGBABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABABFBABABABABAFABABABABABABABABABABABABABABABABABABABABABABABABABABABABABAGABABABABABABABAB",
    "note": "原 Python 种子 42 的固定 4 个替换；最短帧为 26 字节。"
  },
  "noisy": {
    "text": "CDEHHCHCGHHDHCFEDCGEFEEHCGGEDCHHDCCCGHCGDEFGHCDDDHGDHEFECHCDDDCCGHCDFHGGFEDHGCGCGGCECFHCEHDCEFFDHFDHHECFFCFHCGCGECHCFDHGGEEFGHCFCDGDGEDEFGFHHGFDECEHECFHHDEFDDDHGHGHCHCEFECDGDDHCHHFCCDFCECFCGCDDGCEFFGGEGDHFGHGHFCEDHDDDFFHEDCCEHFHCCHCCEHGCHHGHDHDGFGFFFGGCGFD",
    "note": "原 Python 的固定高噪声样本；字面量以 263 字节胜出。"
  },
  "unicode": {
    "text": "春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n春🌱\n",
    "note": "春、🌱、换行组成 3 码点模式，每次占 8 个 UTF-8 字节。"
  },
  "special": {
    "text": "L|R:4\\AB\n零\u0000🙂",
    "note": "包含标点、反斜杠、换行、NUL 和 emoji；无须转义分隔符。"
  },
  "empty": {
    "text": "",
    "note": "空串仍需保存格式标识、模式和长度，完整帧占 6 字节。"
  }
};
const $ = id => document.getElementById(id);
let result = null, current = null, sourceText = '';
const readable = text => JSON.stringify(text);
const nameOf = candidate => candidate.period === null ? 'literal' : `rule-p${candidate.period}`;
function preview(text) {
  const chars = Array.from(text);
  return readable(chars.slice(0, 240).join('')) + (chars.length > 240 ? `\n… 预览 240 / ${chars.length} 码点` : '');
}
function markEdited() {
  $('example').value = 'custom';
  $('example-note').textContent = '自定义输入：点击“比较全部候选”，再检查完整编码与还原。';
  $('status').textContent = '文字已更改，点击比较以更新结果';
  $('lab-results').hidden = true;
  $('warning').hidden = true;
}
function loadPreset(key) {
  if (!PRESETS[key]) return;
  $('text-input').value = PRESETS[key].text;
  $('example').value = key;
  $('example-note').textContent = PRESETS[key].note;
  run();
}
function run() {
  $('warning').hidden = true;
  try {
    const text = $('text-input').value;
    // Bound input before building all candidates, without silently truncating it.
    if (text.length > MAX_UI_CODEPOINTS * 2 || codePoints(text).length > MAX_UI_CODEPOINTS) throw new RangeError(`本页上限为 ${MAX_UI_CODEPOINTS.toLocaleString()} 个码点；请缩短文本，原文未被截断`);
    result = analyze(text); sourceText = text;
    $('lab-results').hidden = false;
    $('codepoint-value').textContent = result.codepoints.toLocaleString();
    $('raw-value').textContent = result.raw_bytes.toLocaleString();
    $('encoded-value').textContent = result.selected.total_bytes.toLocaleString();
    $('roundtrip-value').textContent = result.restored === text ? '完全一致' : '不一致';
    const best = result.selected, literal = result.candidates[0];
    const difference = best.total_bytes - result.raw_bytes;
    const rawComparison = difference > 0 ? `比裸 UTF-8 多 ${difference} 字节` : difference < 0 ? `比裸 UTF-8 少 ${-difference} 字节` : '与裸 UTF-8 字节数相同';
    $('result-summary').textContent = `最短候选 ${nameOf(best)}：${best.total_bytes} 字节；字面量帧 ${literal.total_bytes} 字节。${rawComparison}。${result.candidates.length} 个候选均包含完整头部；总长并列优先字面量，再优先较小周期。`;
    renderCandidates(); inspect(best);
    $('status').textContent = `已比较 ${result.candidates.length} 个候选 · ${nameOf(best)} 最短 · 无损还原已验证`;
  } catch (error) {
    result = null; current = null;
    $('lab-results').hidden = true;
    $('warning').textContent = error.message;
    $('warning').hidden = false;
    $('status').textContent = '未编码：请检查输入';
  }
}
function renderCandidates() {
  $('candidate-bars').replaceChildren(); $('candidate-table').replaceChildren();
  const maxBytes = Math.max(...result.candidates.map(candidate => candidate.total_bytes));
  result.candidates.forEach(candidate => {
    const row = document.createElement('div'); row.className = 'mdl-bar-row';
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = nameOf(candidate);
    button.setAttribute('aria-label', `${nameOf(candidate)}，${candidate.total_bytes} 字节${candidate === result.selected ? '，最短候选' : ''}，点击检查`);
    button.setAttribute('aria-pressed', 'false');
    button.dataset.candidate = candidate.name;
    button.addEventListener('click', () => inspect(candidate));
    const track = document.createElement('div'); track.className = 'mdl-track'; track.setAttribute('aria-hidden', 'true');
    for (const [key, className] of [['header_bytes','mdl-header'], ['model_bytes','mdl-model'], ['residual_bytes','mdl-residual']]) {
      const segment = document.createElement('span'); segment.className = `mdl-segment ${className}`;
      segment.style.width = `${candidate[key] / maxBytes * 100}%`; track.append(segment);
    }
    const cost = document.createElement('span'); cost.className = 'mdl-bar-cost';
    cost.textContent = `${candidate.total_bytes} B${candidate === result.selected ? ' ★' : ''}`;
    row.append(button, track, cost); $('candidate-bars').append(row);
    const tr = document.createElement('tr');
    for (const value of [nameOf(candidate) + (candidate === result.selected ? '（最短）' : ''), candidate.header_bytes, candidate.model_bytes, candidate.residual_bytes, candidate.total_bytes, candidate.exceptions]) {
      const cell = document.createElement('td'); cell.textContent = value; tr.append(cell);
    }
    $('candidate-table').append(tr);
  });
}
function inspect(candidate) {
  current = candidate;
  for (const button of $('candidate-bars').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.candidate === candidate.name));
  $('detail-title').textContent = `${nameOf(candidate)}${candidate === result.selected ? ' · 编码器选中的最短候选' : ' · 查看另一份候选'}`;
  $('header-cost').textContent = `${candidate.header_bytes} B`;
  $('model-cost').textContent = `${candidate.model_bytes} B`;
  $('residual-cost').textContent = `${candidate.residual_bytes} B`;
  $('pattern-value').textContent = candidate.pattern === null ? '无 · 原文直接保存' : `${readable(candidate.pattern)}（${candidate.period} 码点）`;
  $('exception-value').textContent = candidate.period === null ? '不适用' : candidate.exceptions;
  $('detail-total').textContent = `${candidate.total_bytes} B`;
  $('base-title').textContent = candidate.period === null ? '第 1 步：读取字面量数据' : '第 1 步：展开模式，截断至 n 个码点';
  const patternChars = Array.from(candidate.pattern || '');
  const base = candidate.period === null ? sourceText : Array.from({length: result.codepoints}, (_, index) => patternChars[index % patternChars.length]).join('');
  $('base-preview').textContent = preview(base);
  $('base-note').textContent = candidate.period === null ? '字面量的剩余数据就是整段原文，不是零成本。' : `按 ${candidate.period} 码点模式生成 ${result.codepoints} 个码点，再用例外修正所有不匹配的位置。`;
  $('exception-preview').textContent = candidate.period === null ? '字面量没有例外记录。' : candidate.entries.length === 0 ? '没有例外：模式已经完全匹配。' : candidate.entries.slice(0, 40).map(({position, char}) => {
    const posBytes = uvarint(position).length, charBytes = utf8(char).length, lenBytes = uvarint(charBytes).length;
    return `位置 ${position} → ${readable(char)}：${posBytes} + ${lenBytes} + ${charBytes} = ${posBytes + lenBytes + charBytes} B`;
  }).join('\n') + (candidate.entries.length > 40 ? `\n… 预览 40 / ${candidate.entries.length} 条例外，全部均已计费。` : '');
  restoreHex();
}
function restoreHex() {
  if (!current) return;
  $('hex-input').value = toHex(current.blob);
  $('hex-candidate').textContent = `${nameOf(current)} · ${current.blob.length} 个真实字节`;
  decodeCurrent();
}
function decodeCurrent() {
  if (!result) return;
  try {
    const hex = $('hex-input').value;
    if (hex.length > 400_000) throw new RangeError('十六进制输入过长，请限制到 100,000 个字节以内');
    const blob = fromHex(hex);
    if (blob.length > 100_000) throw new RangeError('本页最多接收 100,000 个编码字节');
    const restored = decode(blob, {maxOutputChars: MAX_UI_CODEPOINTS});
    $('decoded-output').value = restored;
    $('decode-status').className = restored === sourceText ? 'mdl-note mdl-success' : 'mdl-note mdl-warning-inline';
    $('decode-status').textContent = restored === sourceText ? `解码成功：${blob.length} 个编码字节 → ${Array.from(restored).length} 个码点，与上方原文完全一致。` : `格式合法，但还原文本与原文不同。${blob.length} 个编码字节 → ${Array.from(restored).length} 个码点；此格式没有校验和。`;
  } catch (error) {
    $('decoded-output').value = '';
    $('decode-status').className = 'mdl-note mdl-warning-inline';
    $('decode-status').textContent = `拒绝解码：${error.message}`;
  }
}
$('text-input').addEventListener('input', markEdited);
$('example').addEventListener('change', () => loadPreset($('example').value));
$('run').addEventListener('click', run);
$('reset').addEventListener('click', () => loadPreset('repeat'));
$('clear').addEventListener('click', () => loadPreset('empty'));
$('decode').addEventListener('click', decodeCurrent);
$('restore-hex').addEventListener('click', restoreHex);
$('hex-input').addEventListener('input', () => {
  $('decoded-output').value = '';
  $('decode-status').className = 'mdl-note';
  $('decode-status').textContent = '字节流已编辑，点击解码以验证；上次还原结果已清除。';
  $('hex-candidate').textContent = '手动编辑的字节流 · 尚未验证';
});
loadPreset('repeat');
