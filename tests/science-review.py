"""Independent scientific parity / derivative review. Run from any directory."""
import json
from pathlib import Path
import random
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'source' / 'series_python'))
from toys.t10_mdl import candidate_encodings

rng = random.Random(1042)
alphabet = 'ABCD春🌱\n\ufeff\x00'
strings = ['', 'AB'*128, '春🌱\n'*48] + [''.join(rng.choices(alphabet, k=rng.randrange(1,300))) for _ in range(100)]
cases = [{'text': s, 'candidates': [{**c.costs(), 'hex': c.blob.hex()} for c in candidate_encodings(s)]} for s in strings]
script = r'''
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as t3 from './source/web/t3-engine.js';
import * as t5 from './source/web/t5-engine.js';
import * as t6 from './source/web/t6-engine.js';
import * as t8 from './source/web/t8-engine.js';
import * as t10 from './source/web/t10-engine.js';
const cases=JSON.parse(fs.readFileSync(process.env.SCIENCE_CASES,'utf8')); let n=0;
for(const x of cases){const cs=t10.candidateEncodings(x.text);assert.equal(cs.length,x.candidates.length);cs.forEach((c,i)=>{for(const k of ['name','period','total_bytes','header_bytes','model_bytes','residual_bytes','exceptions'])assert.deepEqual(c[k],x.candidates[i][k]);assert.equal(Buffer.from(c.blob).toString('hex'),x.candidates[i].hex);assert.equal(t10.decode(c.blob),x.text);n++;});}
console.log(`T10: ${cases.length} independent Unicode strings, ${n} candidates byte-exact with Python; all round-trips exact`);
let worst=0,checks=0;const eps=1e-5;
for(const nonlinear of [true,false]){const p=t3.initialize(123),{grads}=t3.lossAndGrads(t3.XOR,p,nonlinear);for(const k in p)for(let j=0;j<p[k].length;j++){let old=p[k][j];p[k][j]=old+eps;let hi=t3.lossAndGrads(t3.XOR,p,nonlinear).loss;p[k][j]=old-eps;let lo=t3.lossAndGrads(t3.XOR,p,nonlinear).loss;p[k][j]=old;worst=Math.max(worst,Math.abs((hi-lo)/(2*eps)-grads[k][j]));checks++;}}
assert.ok(worst<1e-8);console.log(`T3: ${checks} gradients, maximum absolute finite-difference error ${worst}`);
for(const branch of ['linear','tanh'])for(const residual of [true,false])for(const a of [-1.5,-1,0,.5,1.5]){const c={x:.7,a,blocks:8,branch,residual};const out=t5.scalarStack(c);const d=(t5.scalarStack({...c,x:.7+eps}).output-t5.scalarStack({...c,x:.7-eps}).output)/(2*eps);assert.ok(Math.abs(d-out.derivative)<1e-5);}
console.log('T5: 20 scalar sensitivity configurations pass');
for(const recurrent of [0,.5,1,1.8])for(const distraction of [0,.5,1]){const c={first:1,delay:24,recurrent,distraction};const d=t6.sequence(c).steps.at(-1).derivative;assert.ok(Math.abs(t6.finiteDifference(c)-d)<1e-6);}
console.log('T6: 12 long-delay sensitivity configurations pass');
const a=t8.forward('ABCABA'),b=t8.forward('ABCABC');assert.equal(t8.prefixDifference(a,b),0);assert.ok(a.weights.every((row,i)=>row.every((w,j)=>j<=i||w===0)));
console.log('T8: causal prefix and forbidden attention weights pass');
'''
import os
with tempfile.NamedTemporaryFile('w', suffix='.json', encoding='utf-8') as f:
    json.dump(cases, f); f.flush()
    subprocess.run(['node','--input-type=module'], input=script, text=True, cwd=ROOT,
                   env={**os.environ, 'SCIENCE_CASES': f.name}, check=True)
