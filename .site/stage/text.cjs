'use strict';
/* 互动版的句子切分：生成脚本与测试共用。
 * 句子以 。？！ 结尾；紧随其后的右引号、右括号和脚注编号〔1〕归入同一句。 */

const SENTENCE = /[^。？！]+[。？！]+[”’）」』]*(?:〔\d+(?:[,，、]\d+)*〕)*|[^。？！]+$/g;

function splitSentences(text) {
  return (text.match(SENTENCE) || []).map(s => s.trim()).filter(Boolean);
}

/* 脚注编号在页面里单独着色：把句末的〔1〕拆成正文与编号两段。 */
function splitCitation(sentence) {
  const m = sentence.match(/^(.*?)((?:〔\d+(?:[,，、]\d+)*〕)+)$/s);
  return m ? { body: m[1], cite: m[2] } : { body: sentence, cite: '' };
}

/* 标题折行：在第一个全角标点（？！，：）之后断开，两段各自不再断；没有标点就整句一行。
 * 封面大标题和全文页的标题共用，免得中文标题被从词中间拆开（「什 / 么」）。 */
function splitTitle(title) {
  const cut = title.search(/[？！，：]/);
  return cut >= 0 && cut < title.length - 1 ? [title.slice(0, cut + 1), title.slice(cut + 1)] : [title, ''];
}

/* 去掉所有空白后的纯文字，用来比较两份排版是否同文。 */
const squash = s => String(s).replace(/\s+/g, '');

module.exports = { SENTENCE, splitSentences, splitCitation, splitTitle, squash };
