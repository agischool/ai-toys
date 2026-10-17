from pathlib import Path
import subprocess,sys,os,concurrent.futures,json
from pypdf import PdfReader
root=Path(__file__).resolve().parent.parent
qa=Path('/tmp/ai-articles-polish-qa/docx');qa.mkdir(exist_ok=True)
renderer='/Users/advance/.codex/plugins/cache/openai-primary-runtime/documents/26.1007.11041/skills/documents/render_docx.py'
env=os.environ.copy();env['FONTCONFIG_FILE']='/tmp/ai-series-revised-qa/fonts.conf'
def render(p):
    out=qa/p.parent.name[:2];out.mkdir(exist_ok=True)
    r=subprocess.run([sys.executable,renderer,str(p),'--output_dir',str(out),'--dpi','100','--emit_pdf'],capture_output=True,text=True,env=env)
    (out/'render.log').write_text(r.stdout+'\n'+r.stderr)
    if r.returncode==0:
        page_count=len(PdfReader(next(out.glob('*.pdf'))).pages)
        for old in out.glob('page-*.png'):
            if int(old.stem.split('-')[1])>page_count:old.unlink()
    result={'article':p.parent.name[:2],'exit':r.returncode,'pages':len(list(out.glob('page-*.png')))}
    print(result,flush=True);return result
paths=sorted(root.glob('[0-9][0-9]_*/*.docx'))
if len(sys.argv)>1:paths=[p for p in paths if str(int(p.parent.name[:2])) in sys.argv[1:]]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(render,paths))
assert all(r['exit']==0 and r['pages']>0 for r in results)
result_file=root/'.publishing/render_checks.json'
if len(sys.argv)>1 and result_file.exists():
    old={r['article']:r for r in json.loads(result_file.read_text())};old.update({r['article']:r for r in results});results=sorted(old.values(),key=lambda r:r['article'])
result_file.write_text(json.dumps(results,indent=2))
