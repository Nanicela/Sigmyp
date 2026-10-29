import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountForm,normalizeAccount,accountFieldInput} from '../web/commercial-account.js';
test('normaliza selectores sin convertir IVA desconocido en no responsable',()=>{
 const input=accountForm({name:' Cuenta ',status:'Nuevo',personType:'JURIDICA'});
 const value=normalizeAccount(input);
 assert.equal(value.name,'Cuenta');assert.equal(value.status,'NEW');assert.equal(value.vatResponsible,null);
 assert.equal(normalizeAccount({...input,vatResponsible:'false'}).vatResponsible,false);
});
test('rechaza campos y opciones inválidas sin incluir identificadores de origen del formulario',()=>{
 const input=accountForm({name:'Cuenta',status:'ACTIVE',personType:'NATURAL',vatResponsible:true});
 for(const extra of [{name:''},{email:'mal'},{status:'SUPERADMIN'},{personType:''},{vatResponsible:'inventado'}])
  assert.throws(()=>normalizeAccount({...input,...extra}));
 assert.equal(normalizeAccount({...input,sourceId:999}).sourceId,undefined);
});

test('valida teléfonos y correos conservando ceros iniciales y campos opcionales',()=>{
 const input=accountForm({name:'Cuenta',personType:'JURIDICA'});
 assert.equal(normalizeAccount({...input,phone1:'0012345678',email:'cuenta+ventas@ejemplo.com'}).phone1,'0012345678');
 assert.equal(normalizeAccount(input).phone2,'');
 for(const extra of [{phone1:'123abc'},{phone2:'1e8'},{phone1:'123 456'},{billingEmail:'sin-correo'}])assert.throws(()=>normalizeAccount({...input,...extra}));
});

test('filtra letras y símbolos al escribir o pegar teléfonos sin alterar correos',()=>{
 assert.equal(accountFieldInput('phone1','+57 (031) 123-abc'), '57031123');
 assert.equal(accountFieldInput('phone2','00123'), '00123');
 assert.equal(accountFieldInput('email','ventas+1@empresa.com'), 'ventas+1@empresa.com');
});
