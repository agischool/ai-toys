// Minimal single-select value semantics for DOM adapters. Values match option
// strings exactly: assigning '.8' does not select an option whose value is '0.8'.
export function installNativeSelects(elements,html){
 const selects=[];
 for(const match of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
  const el=elements[match[1]]; if(!el)throw new Error(`Missing select ${match[1]}`);
  let options=[],value='',body='';
  const update=text=>{body=String(text);options=[...body.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(m=>({value:m[1].match(/\bvalue="([^"]*)"/)?.[1]??m[2],selected:/\bselected\b/.test(m[1])}));value=(options.find(o=>o.selected)??options[0])?.value??'';};
  Object.defineProperty(el,'value',{configurable:true,get:()=>value,set:v=>{v=String(v);value=options.some(o=>o.value===v)?v:'';}});
  Object.defineProperty(el,'innerHTML',{configurable:true,get:()=>body,set:update});
  Object.defineProperty(el,'selectedIndex',{get:()=>options.findIndex(o=>o.value===value)});
  update(match[2]);selects.push(el);
 }
 return selects;
}
