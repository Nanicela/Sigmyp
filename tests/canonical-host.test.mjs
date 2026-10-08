import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalHostingUrl} from '../web/canonical-host.js';

test('envía el Hosting anterior a sigmyp y conserva ruta, consulta y sección',()=>{
  assert.equal(
    canonicalHostingUrl('https://facturacion-electronica-a73e3.web.app/app.html?section=productos#clientes'),
    'https://sigmyp.web.app/app.html?section=productos#clientes'
  );
});

test('no redirige sigmyp, localhost u otros dominios',()=>{
  for(const url of ['https://sigmyp.web.app/','http://localhost:5504/','https://example.com/'])
    assert.equal(canonicalHostingUrl(url),null);
});
