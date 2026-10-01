import assert from 'node:assert/strict';
import fs from 'node:fs';
import fixtures from '../docs/fixture-data.js';
import {DEFAULT,makeData,finish,results,validateConfig} from '../docs/engine.js';
const reference=JSON.parse(fs.readFileSync(new URL('../source/t1_python/fixtures.json',import.meta.url)));
let checked=0,maxError=0;
for(const expected of reference.references){
 const data=makeData(fixtures,expected),got=results(finish(data,expected.lr),data);
 for(const k of ['w','b','train_mse','test_mse','initial_mse']){
  const error=Math.abs(got[k]-expected[k])/Math.max(1,Math.abs(expected[k]));maxError=Math.max(maxError,error);assert.ok(error<2e-12,`${k}: ${JSON.stringify(expected)}`);
 }
 assert.equal(got.steps,expected.steps);assert.equal(got.reason,expected.reason);checked++;
}
assert.deepEqual(makeData(fixtures,DEFAULT),makeData(fixtures,DEFAULT));
for(const c of [{...DEFAULT,lr:NaN},{...DEFAULT,lr:2},{...DEFAULT,n:9},{...DEFAULT,noise:-1},{...DEFAULT,seed:3}])assert.throws(()=>validateConfig(c),RangeError);
console.log(JSON.stringify({pythonReferenceCases:checked,maxRelativeError:maxError,default:results(finish(makeData(fixtures,DEFAULT),DEFAULT.lr),makeData(fixtures,DEFAULT))},null,2));
