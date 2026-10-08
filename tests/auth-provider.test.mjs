import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedSignInProvider} from '../web/auth-provider.js';

test('admite contraseña y Google como proveedores de inicio de sesión',()=>{
  assert.equal(allowedSignInProvider('password'),true);
  assert.equal(allowedSignInProvider('google.com'),true);
});

test('rechaza proveedores que no fueron habilitados por la aplicación',()=>{
  for(const provider of ['facebook.com','github.com','phone','',undefined])
    assert.equal(allowedSignInProvider(provider),false);
});
