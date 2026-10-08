import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCompany} from '../web/company-selection.js';
test('roles normales entran automáticamente a su única compañía',()=>{
 for(const role of ['admin','billing','viewer'])assert.equal(chooseCompany(['demo'],{platform:false,selected:'otra',previous:'anterior'}),'demo',role);
});
test('superadministradora conserva elección explícita aunque solo exista una',()=>{
 assert.equal(chooseCompany(['demo'],{platform:true}),'');
 assert.equal(chooseCompany(['a','b'],{platform:true,previous:'b'}),'b');
});
test('sin acceso o con asignaciones inconsistentes no elige arbitrariamente',()=>{
 assert.equal(chooseCompany([],{platform:false,previous:'a'}),'');
 assert.equal(chooseCompany(['a','b'],{platform:false,previous:'a'}),'');
});
