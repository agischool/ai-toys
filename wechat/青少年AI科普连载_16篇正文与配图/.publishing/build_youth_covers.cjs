const fs=require('fs'),path=require('path');
const {chromium}=require('/Users/advance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {C,txt,box,circle,arrow,route,pill,cat,book,magnify,umbrella,matrix,tiles,lock,robot,object}=require('./build_youth_illustrations.cjs');
const root=path.resolve(__dirname,'..'),dirs=fs.readdirSync(root).filter(x=>/^\d\d_/.test(x)).sort();
const names=[['AI到底在做什么？','从认猫开始'],['只见过红色积木','换成蓝色会怎样？'],['一张图片','怎样变成数字？'],['AI答错以后','到底改了什么？'],['一个小窗口','怎样找到线索？'],['神经网络越深','为什么不一定更好？'],['读到故事结尾','还记得开头的红伞吗？'],['一次接一片文字','怎样写出一段话？'],['这句话里的“它”','到底指谁？'],['接出下一片文字前','AI里面发生了什么？'],['给AI一本笔记本','就不会忘了吗？'],['大模型越大','就一定越好吗？'],['把八个字母写成四个','和AI有什么关系？'],['认出物体','就理解它们的关系吗？'],['AI答得像真的','应该怎样检查？'],['校园AI助手','何时该说“不知道”？']];
const themes=['输入 → 计算 → 判断','看颜色？还是看形状？','像素，是图像的数字入口','拨动参数，预测跟着改变','同一套权重，到处用','原值 ＋ 修正','状态在变，线索能否留下？','概率，让文字一步步生长','联系上下文，再作解释','表示、注意力与生成','存得下、找得到、用得对','质量、速度、成本一起看','规则和例外，都得计费','对象清单里，还缺位置','让原始资料支持具体主张','有依据才回答，越界就停下'];
function scene(a){switch(a){
case 1:return cat(172,175,1.9)+pill(45,321,267,'猫 0.8',C.mint,38);
case 2:return object('红圆',91,119,117)+object('蓝圆',278,119,117)+object('红方',91,296,110)+object('蓝方',278,296,110);
case 3:return matrix(67,60,['010','111','010'],88,C.teal,true)+pill(33,354,333,'010 111 010',C.gold,32);
case 4:return circle(193,199,144,C.gold)+circle(193,199,83,C.white)+txt(193,221,'b',82,C.ink,800,'middle')+route('M193 198L251 136',C.coral,12)+txt(55,106,'0',35)+txt(190,28,'1',35)+txt(334,106,'2',35);
case 5:return matrix(15,96,['01000','01000','01000'],72,C.teal,true,1)+pill(83,347,220,'0  3  0',C.gold,37);
case 6:return circle(83,76,45,C.gold)+txt(83,91,'10',39,C.ink,800,'middle')+route('M83 131V274H156',C.teal,12)+route('M136 77H310V143',C.coral,8)+box(228,166,144,80,C.rose)+txt(300,219,'＋1',41,C.ink,800,'middle')+route('M303 258V304H257',C.coral,8)+circle(205,302,42,C.white)+txt(205,316,'＋',39,C.ink,800,'middle')+pill(74,369,269,'10＋1＝11',C.mint,34);
case 7:return umbrella(177,191,2)+box(14,335,133,64,C.mint)+txt(80,380,'红',41,C.ink,800,'middle')+arrow(164,366,223,366)+box(244,335,133,64,C.mint)+txt(310,380,'红',41,C.ink,800,'middle');
case 8:return tiles(15,58,['我'],105,82,C.gold)+arrow(140,101,209,101)+tiles(231,60,['读书'],145,82,C.mint)+route('M304 163V233H94',C.coral,7)+tiles(17,269,['我','读书','。'],111,84,C.blue);
case 9:return object('红圆',90,164,135)+box(232,90,138,173,C.cream,10)+txt(90,291,'小球',31,C.ink,700,'middle')+txt(300,310,'盒子',31,C.ink,700,'middle')+pill(35,350,330,'“它”太大了？',C.mint,33);
case 10:return [0,1,2].map((n)=>box(55+n*28,267-n*94,258,84,[C.mint,C.blue,C.rose][n],18)+txt(183+n*28,320-n*94,['下一片','联系前文','数字表示'][n],32,C.ink,700,'middle')).join('');
case 11:return book(94,66,233,260,C.teal)+pill(129,110,155,'AI笔记',C.gold,30)+tiles(25,355,['红','蓝','黄'],111,65,C.blue);
case 12:return [['A',167,C.blue],['B',244,C.mint],['C',300,C.rose]].map(([s,h,c],i)=>box(12+i*134,374-h,118,h,c,15)+txt(71+i*134,340,s,43,C.ink,800,'middle')).join('')+txt(202,49,'选谁？',39,C.ink,800,'middle');
case 13:return tiles(12,82,['R','4','A','B'],85,89,C.mint)+arrow(195,198,195,245)+tiles(9,285,['A','B','A','B'],85,65,C.gold)+txt(353,395,'…',43,C.ink,800,'end');
case 14:return object('红圆',76,139,92)+object('蓝方',286,139,92)+arrow(139,139,219,139)+object('红圆',61,332,70)+object('绿三角',195,332,80)+object('蓝方',332,332,70)+txt(189,53,'谁在谁左边？',31,C.ink,700,'middle');
case 15:return box(65,45,249,302,C.white,15)+[0,1,2,3].map(i=>`<path d="M96 ${108+i*53}H267" stroke="${i===1?C.coral:C.teal}" stroke-width="10" stroke-linecap="round"/>`).join('')+magnify(280,281,64);
case 16:return book(24,54,189,231,C.teal)+lock(263,120)+pill(38,336,320,'有依据 → 回答',C.gold,33);
}}
function make(a,square){const w=square?900:1080,h=square?900:460,fill=[C.cream,C.blue,C.mint,C.rose][(a-1)%4],n=names[a-1];
 const header=txt(square?57:43,square?67:55,'青少年 AI 科普连载',square?29:25,C.teal,800)+txt(w-(square?65:44),square?70:55,`${String(a).padStart(2,'0')} / 16`,square?28:25,C.muted,600,'end');
 const title=n.map((s,i)=>txt(square?57:43,(square?159:150)+i*(square?76:70),s,square?57:52,C.ink,800)).join('');
 const hero=square?`<g transform="translate(72,325) scale(1.16)">${scene(a)}</g>${robot(546,443,308)}`:`<g transform="translate(640,75) scale(.72)">${scene(a)}</g>${robot(938,298,118)}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><marker id="arr" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" viewBox="0 0 9 9" refX="7.5" refY="4.5" orient="auto"><path d="M1 1L8 4.5L1 8" fill="none" stroke="${C.ink}" stroke-width="1.5"/></marker></defs><style>text{font-family:'PingFang SC','Noto Sans CJK SC',sans-serif}</style><rect width="${w}" height="${h}" fill="${C.paper}"/><path d="${square?'M-40 485Q465 152 940 502V930H-40Z':'M594 -20Q513 256 765 484H1100V-20Z'}" fill="${fill}"/>${header}${title}${hero}${txt(square?57:43,square?845:370,themes[a-1],square?30:28,C.muted,600)}<path d="M${square?57:43} ${square?280:266}h80" stroke="${C.coral}" stroke-width="8" stroke-linecap="round"/></svg>`;
}
async function main(){const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),p=await b.newPage({deviceScaleFactor:1});
 for(let a=1;a<=16;a++)for(const square of [false,true]){const s=make(a,square),w=square?900:1080,h=square?900:460;await p.setViewportSize({width:w,height:h});await p.setContent('<style>body{margin:0}svg{display:block}</style>'+s);await p.evaluate(()=>document.fonts.ready);fs.writeFileSync(path.join(__dirname,'youth-art',`${String(a).padStart(2,'0')}-cover-${square?'square':'wide'}.svg`),s);await p.screenshot({path:path.join(root,dirs[a-1],square?'00_封面图_方形1x1.png':'00_封面图_横版2.35.png')});}
 await b.close();console.log('Rendered 32 illustrated covers');}
main().catch(e=>{console.error(e);process.exit(1)});
