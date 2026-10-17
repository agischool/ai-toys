const fs=require('fs'); const path=require('path');
const {chromium}=require('/Users/advance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..');
const dirs=fs.readdirSync(ROOT).filter(x=>/^\d\d_/.test(x)).sort();
const titles=JSON.parse(fs.readFileSync(path.join(__dirname,'titles.json')));
const source=path.join(__dirname,'图解源文件');fs.mkdirSync(source,{recursive:true});
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
// Adapted from documd-visuals executive-brief-summary: a bounded single stack,
// using the Default palette. Diagrams are authored as HTML/CSS, not bitmap edits.
const css=`*{box-sizing:border-box}body{margin:0;color:#1f2937;background:#ffffff;font:17px/1.5 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}.fig{width:360px;padding:20px 16px;background:#ffffff;border:1px solid #5b6b8c}h1{font-size:23px;line-height:1.3;margin:0 0 18px}h2{font-size:18px;line-height:1.45;margin:0 0 8px}p{margin:8px 0}.f-panel{padding:12px;background:#eef2fb;margin:10px 0;border-radius:9px}.f-note{font-size:14px;line-height:1.5;color:#676f7e;margin-top:14px}.f-arrow{text-align:center;font-size:25px;line-height:1;color:#5b6b8c;margin:6px 0}.f-big{font-size:27px;font-weight:750;color:#2b66c4}.f-row{display:flex;gap:10px;align-items:center;justify-content:space-between}.f-center{text-align:center}.f-chip{border:1px solid #5b6b8c;border-radius:5px;padding:3px 8px}.f-grid{display:grid;gap:10px;grid-template-columns:1fr 1fr}.f-matrix{display:inline-grid;gap:1px;background:#5b6b8c;border:1px solid #5b6b8c;vertical-align:middle}.f-cell{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:#ffffff;font-size:17px}.f-on{background:#2b66c4;color:#ffffff}.f-black{background:#1f2937;color:#ffffff}.f-eq{font-size:22px;font-weight:650;letter-spacing:.2px}.f-table{width:100%;border-collapse:collapse;font-size:16px;margin:10px 0}.f-table th,.f-table td{border:1px solid #5b6b8c;padding:8px 5px;text-align:center}.f-table th{background:#dfe5fb}.f-table td{background:#f8fafc}.f-muted{background:#f8fafc!important;color:#676f7e}.f-pass{font-weight:700;color:#1f7a33}.f-warn{font-weight:700;color:#d1242f}.f-slot{border:1px solid #5b6b8c;border-radius:5px;min-width:43px;text-align:center;padding:6px 2px;background:#ffffff}.f-slot small{display:block;font-size:14px;color:#676f7e}.f-code{font-size:23px;letter-spacing:2px;overflow-wrap:anywhere;font-family:ui-monospace,monospace}.f-shape{display:inline-block;width:33px;height:33px;background:#2b66c4;vertical-align:middle}.f-circle{border-radius:50%;background:#d1242f}.f-triangle{background:none;width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-bottom:35px solid #2f9e44}.f-small{font-size:15px}.f-step{display:flex;gap:10px;align-items:center}.f-number{font-size:24px;font-weight:700;color:#2b66c4;min-width:28px}`;
const panel=(head,body,cls='')=>`<div class="f-panel ${cls}">${head?`<h2>${head}</h2>`:''}${body}</div>`;
const arrow='<div class="f-arrow">↓</div>';
const note=t=>`<p class="f-note">${t}</p>`;
const eq=t=>`<p class="f-eq">${t}</p>`;
const big=t=>`<span class="f-big">${t}</span>`;
const table=(heads,rows)=>`<table class="f-table"><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(x=>`<td${x==='遮住'?' class="f-muted"':x==='可读'?' style="background:#d9e3f4"':''}>${x}</td>`).join('')+'</tr>').join('')}</tbody></table>`;
const matrix=(rows,black=false)=>`<span class="f-matrix" style="grid-template-columns:repeat(${rows[0].length},30px)">${rows.flatMap(x=>[...x]).map(x=>`<span class="f-cell ${x=='1'?(black?'f-black':'f-on'):''}">${x}</span>`).join('')}</span>`;
const step=(n,text)=>panel('',`<div class="f-step"><span class="f-number">${n}</span><div>${text}</div></div>`);
const shapes=order=>`<div class="f-row f-center">${order.map(x=>`<div><span class="f-shape ${x==='红圆'?'f-circle':x==='绿三角'?'f-triangle':''}"></span><div>${x}</div></div>`).join('')}</div>`;
const slots=arr=>`<div class="f-row">${arr.map((x,i)=>`<div class="f-slot"><small>${i+1}号</small>${x}</div>`).join('')}</div>`;
let figs=[];
function fig(article,index,title,body,foot='原理示意 · 数值由本文设定'){
 const d=dirs[article-1];const names=fs.readdirSync(path.join(ROOT,d)).filter(x=>x.endsWith('.png')&&!x.startsWith('00_')).sort();
 const file=names[index-1];if(!file)throw Error([article,index]);
 const html=`<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><style>${css}</style><section class="fig"><h1>${title}</h1>${body}${note(foot)}</section></html>`;
 figs.push({article,file,html,output:path.join(ROOT,d,file)});
}
fig(1,1,'图片怎样变成判断',panel('训练时','带标签的图片 → 比较预测与标签<br>→ 调整参数，反复进行')+arrow+panel('使用时',step(1,'新图片 → 数字表示')+step(2,'已训练模型 → 类别分数')+step(3,'猫 0.8，狗 0.2<br>按最高分显示“猫”'))+note('使用已有参数，通常不会因每张新图自动重训。'));
fig(1,2,'高分也可能答错',panel('输入','一张模糊的毛绒玩具照片')+arrow+panel('只允许猫狗二选一',eq('猫 0.9　狗 0.1'))+arrow+panel('输出“猫”','照片已超出约定任务范围。<br>高分不能替代输入检查与复核。'),'假设情景 · 并非真实模型测试');
fig(2,1,'训练全对 换搭配就不同',panel('两条手写规则','A看颜色：红→圆，蓝→方<br>B看轮廓：圆→圆，方→方')+panel('训练集：8个',shapes(['红圆','蓝方'])+'<p>4个红圆＋4个蓝方</p>'+eq('A：8/8　B：8/8'))+panel('测试集：4个','2个蓝圆＋2个红方'+table(['规则','答对','正确率'],[['A 看颜色','0/4','0%'],['B 看轮廓','4/4','100%']])),'手写规则算例 · 测试刻意换了颜色搭配');
fig(2,2,'补上缺失的搭配',panel('原有样本','4个红圆＋4个蓝方')+arrow+panel('新增样本','1个蓝圆＋1个红方<br>合计10个训练例子')+table(['规则','答对','正确率'],[['A 看颜色','8/10','80%'],['B 看轮廓','10/10','100%']])+note('颜色规则在新增的两例上出错，轮廓规则仍全对。'),'手写规则算例 · 不是模型重训结果');
fig(3,1,'九个格子 保存一个十字',panel('约定：黑1 白0',`<div class="f-center">${matrix(['010','111','010'],true)}</div>`)+arrow+panel('按行读出','<div class="f-code f-center">010 | 111 | 010</div><p>每3个数恢复一行，得到原图。</p>')+panel('只把第5个数改为0',`<div class="f-row">${matrix(['010','101','010'],true)}<div>中心变成白洞<br><span class="f-small">010 | 101 | 010</span></div></div>`),'竖线仅分隔行 · 不属于数字序列');
fig(3,2,'灰度与 RGB 怎样记颜色',panel('8位灰度：每格1个数','<div class="f-row"><div style="width:72px;height:62px;background:#000000"></div><div style="width:72px;height:62px;background:#808080"></div><div style="width:72px;height:62px;background:#ffffff;border:1px solid #5b6b8c"></div></div><div class="f-row"><span>0 黑</span><span>128 灰</span><span>255 白</span></div>')+panel('sRGB：每格3个数',table(['颜色','R','G','B'],[['红','255','0','0'],['蓝','0','0','255'],['白','255','255','255']]))+eq('3×3彩色图 → 27个数'),'每通道8位的示例 · 不含透明度等额外信息');
fig(4,1,'训练调整的是参数 b',panel('保持不变','输入：1、2、3<br>目标：3、4、5')+arrow+panel('模型形式已固定',eq('预测值＝输入值＋b'))+arrow+panel('可以调的旋钮',big('b：0 → 1 → 2')+'<p>拨动b，三个预测一起改变。</p>'));
fig(4,2,'同一批样本 三次试数',panel('目标始终是3、4、5',table(['参数b','预测值','总绝对误差'],[['0','1、2、3','2＋2＋2＝6'],['1','2、3、4','1＋1＋1＝3'],['2','3、4、5','0＋0＋0＝0']]))+eq('损失：6 → 3 → 0'),'手动搜索三个值 · 不是梯度下降推导');
fig(5,1,'同一模板 为什么得分不同',panel('固定模板',`<div class="f-center">${matrix(['010','010','010'])}</div><p>逐格相乘，再把结果相加。</p>`)+`<div class="f-grid">${[['竖线',['010','010','010'],3],['中心点',['000','010','000'],1],['横线',['000','111','000'],1],['全黑',['111','111','111'],3]].map(([h,m,s])=>panel(h,`${matrix(m)}<p>响应 ${big(s)}</p>`,'f-center')).join('')}</div>`+note('竖线和全黑都得3分：一个分数还不足以认定形状。'));
fig(5,2,'窗口移动 高分位置也移动',panel('原图：竖线在第2列',`<div class="f-center">${matrix(['01000','01000','01000'])}</div>`)+table(['覆盖列','模板中心列','响应'],[['1—3','2','3'],['2—4','3','0'],['3—5','4','0']])+panel('特征图保留位置信息',eq('原图：3　0　0')+'竖线移到第3列后：'+eq('平移：0　3　0')),'步长为1、不补边 · 同一套权重反复使用');
fig(6,1,'保留原值 再加修正',panel('直接变换',eq('10 → 学习完整变换 → 11'))+panel('残差结构',`<div class="f-center">输入 ${big('10')}</div>`+arrow+`<div class="f-grid">${panel('直通路径',big('10'),'f-center')}${panel('F分支',big('1'),'f-center')}</div>`+arrow+`<div class="f-center">两路相加${eq('10＋1＝11')}</div>`)+note('若F输出0，则10＋0＝10，保留原值。'));
fig(6,2,'一点变化 沿两路汇合',panel('输入从2变为2.1',eq('输入增加0.1'))+table(['路线','原结果','新结果'],[['直通路径','2','2.1'],['F：乘0.5','1','1.05'],['相加','3','3.15']])+panel('总变化',eq('0.1＋0.05＝0.15')),'线性算例 · 不保证真实训练始终顺利');
fig(7,1,'红伞线索 能不能留下',panel('相同故事','① 带红伞出门<br>② 天阴了<br>③ 起风了<br>④ 问伞是什么颜色')+panel('规则一：只留最新一句','红伞 → 天阴 → 起风'+eq('最后无法知道颜色'))+panel('规则二：专门保留颜色','红 → 红 → 红'+eq('最后回答“红”')),'便签类比由人设定 · 真实RNN传递数值状态');
fig(7,2,'保留一部分 再写入新内容',panel('旧状态',big('2'),'f-center')+arrow+panel('乘保留系数0.5',eq('2×0.5＝1'),'f-center')+arrow+panel('加上本次新写入量1',eq('1＋1＝2'),'f-center')+panel('把保留系数改成0.9',eq('2×0.9＋1＝2.8')),'简化乘加关系 · 新写入量不是门值 · 非完整LSTM');
fig(8,1,'同一份概率 两种选法',panel('给定开头“我”','接“读书”：0.6<br>接“画画”：0.4<br>之后均以概率1接句号')+panel('贪心：每步选最高概率',eq('我 → 读书 → 。')+'得到“我读书。”')+panel('采样：按概率抽取','10张等机会卡片：<br>1—6号“读书”，7—10号“画画”<br>本次抽中8号：'+eq('我 → 画画 → 。')),'手工概率示例 · 采样也可能选到“读书”');
fig(8,2,'新文字 怎样成为下一步线索',step(1,'已有文字：我')+arrow+step(2,'算候选概率 → 选择“画画”')+arrow+step(3,'接回上下文：我画画')+arrow+step(4,'未停止 → 再算一次<br>选择句号：我画画。')+panel('达到停止条件','本例约定遇到句号就停。<br>真实系统可以采用其他条件。'),'本例只查最后一片 · 真实模型可利用更长上下文');
fig(9,1,'只换一个字 “它”就变了',panel('小球没放进盒子','因为它太大了。'+eq('“它”通常指小球'))+panel('小球没放进盒子','因为它太小了。'+eq('“它”通常指盒子'))+note('“大”“小”的解释依赖整个情境，额外背景也可能改变理解。'),'句意分析 · 不是实测注意力权重');
fig(9,2,'信息相同 权重改变结果',panel('给2更多权重',table(['信息','权重','乘积'],[['2','0.75','1.5'],['10','0.25','2.5']])+eq('1.5＋2.5＝4'))+panel('给10更多权重',table(['信息','权重','乘积'],[['2','0.25','0.5'],['10','0.75','7.5']])+eq('0.5＋7.5＝8')),'每组权重和为1 · 2与10不代表小球和盒子');
fig(10,1,'生成型 Transformer 的路线',step(1,'token编号 → 嵌入＋位置信息')+arrow+panel('② 多个Transformer块','<div class="f-center">因果多头自注意力'+arrow+'残差相加 → 归一化'+arrow+'前馈网络'+arrow+'残差相加 → 归一化</div>')+arrow+step(3,'输出层 → 候选分数')+arrow+step(4,'概率分布 → 选择下一token'),'仅展示解码器流程及一种归一化顺序');
fig(10,2,'每一行 只能读取到自己',table(['输入位置','今天','下雨','了'],[['今天','可读','遮住','遮住'],['下雨','可读','可读','遮住'],['了','可读','可读','可读']])+panel('这一行 → 预测下一片',eq('今天 → 下雨')+eq('下雨 → 了')+eq('了 → 。'))+note('训练时各行可并行计算，但都不能偷看未来位置。'),'示意分词 · “了”这一行预测句号');
fig(11,1,'同一地址 内容可以改变',panel('① 依次写入',slots(['红','蓝','黄','空','空']))+panel('② 读取2号',eq('返回“蓝”')+'读取不会移走内容。')+panel('③ 用“绿”覆盖2号',slots(['红','绿','黄','空','空']))+panel('④ 再读2号',eq('返回“绿”')),'离散读写示意 · 未留历史就不能从2号找回蓝');
fig(11,2,'加权读取 返回组合值',panel('两个存储位置',table(['位置','内容','读取权重'],[['A','2','0.75'],['B','10','0.25']]))+arrow+panel('先乘 再相加',eq('2×0.75＋10×0.25')+big('＝4'))+note('4是组合值，不是随机抽到2或10；完整NTM还要计算读写权重。'));
fig(12,1,'质量 速度 成本一起看',table(['方案','答对题数','耗时','成本'],[['A','80/100','1秒','1点'],['B','90/100','4秒','3点'],['C','92/100','8秒','6点']])+panel('从B换到C','多答对2题<br>多等4秒，多花3点')+note('是否值得，要看多答对的题是什么、错误会造成什么后果。'),'全部数据虚构 · 方案名称不代表参数大小');
fig(12,2,'限制一变 可选方案就变',panel('预算≤3点，时限≤5秒',table(['方案','满足条件'],[['A：1点／1秒','是'],['B：3点／4秒','是'],['C：6点／8秒','否']])+'优先答对题数时：'+big('选B'))+panel('预算不变，时限收紧到2秒','A仍合格。<br>B超时，C超时且超预算。'+eq('只有A可行')),'虚构选型示例 · 真实服务耗时会波动');
fig(13,1,'规则和例外 都要计费',panel('原串 ABABABAB','直接：<span class="f-code">LABABABAB</span><br>'+big('9单位')+'<p>重复：<span class="f-code">R4AB</span><br>'+big('4单位')+'</p>')+panel('原串 ABABABAC','直接：<span class="f-code">LABABABAC</span><br>'+big('9单位')+'<p>重复＋例外：<span class="f-code">R4AB8C</span><br>'+big('6单位')+'</p>')+note('R4AB8C：先重复AB四次，再把第8位换成C。'),'同一套固定读法 · 每个编码字符计1单位');
fig(14,1,'对象没变 关系答案变了',panel('第一次排列',shapes(['红圆','蓝方','绿三角'])+'<p class="f-center">红圆在蓝方左边</p><div class="f-center">蓝方左侧有 '+big('1个')+'</div>')+panel('交换蓝方和绿三角',shapes(['红圆','绿三角','蓝方'])+'<p>红圆和绿三角都在蓝方左边</p><div class="f-center">蓝方左侧有 '+big('2个')+'</div>')+note('对象清单相同；若不保留位置，就分不清这两种答案。'),'按图中左右判断 · 原创关系示意');
fig(15,1,'链接里的话 支持答案吗',panel('待核查的主张','本校图书馆本周日开放。')+panel('公告写“周日开放”',big('支持'))+panel('公告写“周日闭馆”','<span class="f-big" style="color:#d1242f">相矛盾</span>')+panel('公告只列周一至周五',big('证据不足')),'假设来源学校和适用时间均已核准');
fig(15,2,'总分90% 遮住了什么',panel('A类：常规安排',big('90/90答对 → 100%'))+panel('B类：临时变更',big('0/10答对 → 0%'))+arrow+panel('合并后的总成绩',big('90/100 → 90%'))+note('问临时检修时，漂亮的总分不能替代B类的表现。'),'100个构造例子 · 非真实产品测评');
// File order in article 16: results first, workflow second.
fig(16,1,'五个问题 五种处理结果',panel('本学期周二15点','D1：工作日12—18点<br>'+big('按常规安排开放'))+panel('本学期周日','D1：周末闭馆<br>'+big('按安排闭馆'))+panel('临时检修还开吗','没有检修通知<br>'+big('未知，向服务台核实'))+panel('明年也这样开放吗','D1只适用于本学期<br>'+big('未知，不外推'))+panel('索要同学家庭住址','不属于公开服务信息<br>'+big('拒绝提供或推测')),'按规则完成的纸面推演 · 非独立软件测试');
fig(16,2,'校园助手 先检查再回答',step(1,'范围检查<br>隐私越界 → 停止并说明边界')+arrow+step(2,'检索已核准的公开资料')+arrow+step(3,'核对来源、适用期和具体主张')+arrow+panel('有足够依据','回答，并列出公告及相关原句')+panel('依据不足或冲突','说明未知，建议向服务台核实')+note('含糊先澄清；临时变化不能只按常规时间作答。'),'纸面设计 · 检索、判断和生成仍需实际验证');

const motifs=['猫 0.8　狗 0.2','红圆 → 蓝圆','010 / 111 / 010','b：0 → 1 → 2','3　0　0 → 0　3　0','原值 ＋ 修正','红 → 红 → 红','我 → 读书 → 。','2×0.75＋10×0.25＝4','前文 → 计算 → 下一片','写入 → 定位 → 读取','质量 · 速度 · 成本','R4AB → ABABABAB','左侧：1个 → 2个','主张 → 原文 → 核对','有依据 → 回答'];
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const page=await browser.newPage({viewport:{width:360,height:900},deviceScaleFactor:3});
 const meta=[];
 for(const f of figs){
  fs.writeFileSync(path.join(source,String(f.article).padStart(2,'0')+'_'+f.file.replace('.png','.html')),f.html);
  await page.setContent(f.html);await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.fig *')].filter(e=>e.scrollWidth>e.clientWidth+2&&e.clientWidth>0).map(e=>e.outerHTML.slice(0,150)));
  if(overflow.length)console.log('OVERFLOW',f.file,overflow);
  await page.locator('.fig').screenshot({path:f.output});
  meta.push({article:f.article,file:f.file,height:await page.locator('.fig').evaluate(e=>e.offsetHeight),overflow});
 }
 const coverPage=await browser.newPage({viewport:{width:1080,height:460},deviceScaleFactor:1});
 for(let i=0;i<16;i++)for(const square of [false,true]){
  const w=square?300:360,h=square?300:460/3;
  const title=titles[i].replace(/？$/,'');
  const html=`<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}.cover{box-sizing:border-box;width:${w}px;height:${h}px;background:#14304A;color:white;padding:${square?'30px 24px':'14px 22px'};position:relative;overflow:hidden}.series{font-size:${square?12:10}px;color:#BAD3E7;letter-spacing:1px}.title{font-size:${square?26:23}px;line-height:1.32;font-weight:750;margin:${square?'25px 0 20px':'8px 0 7px'};max-width:310px}.motif{font-size:${square?16:12}px;color:#BAD3E7}.rule{height:3px;width:34px;background:#E07A30;margin-bottom:8px}</style><div class="cover"><div class="series">青少年 AI 科普　${String(i+1).padStart(2,'0')} / 16</div><div class="title">${esc(title)}</div><div class="rule"></div><div class="motif">${esc(motifs[i])}</div></div></html>`;
  await coverPage.setViewportSize({width:w*3,height:square?900:460});await coverPage.setContent(html);await coverPage.addStyleTag({content:'.cover{transform:scale(3);transform-origin:0 0}'});await coverPage.evaluate(()=>document.fonts.ready);
  await coverPage.screenshot({path:path.join(ROOT,dirs[i],square?'00_封面图_方形1x1.png':'00_封面图_横版2.35.png')});
  const fit=await coverPage.locator('.cover').evaluate(e=>e.scrollHeight<=e.clientHeight);if(!fit)throw Error('cover overflow '+i);
 }
 fs.writeFileSync(path.join(__dirname,'figure_checks.json'),JSON.stringify(meta,null,2));
 await browser.close();console.log('Rendered',figs.length,'figures and 32 covers');
}
main().catch(e=>{console.error(e);process.exit(1)});
