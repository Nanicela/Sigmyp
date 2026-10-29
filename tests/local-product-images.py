import importlib.util, tempfile, pathlib, threading, http.client, io, unittest
from PIL import Image
spec=importlib.util.spec_from_file_location('local_server',pathlib.Path(__file__).resolve().parents[1]/'scripts/serve-local.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Images(unittest.TestCase):
 def test_upload_validation_and_preservation(self):
  with tempfile.TemporaryDirectory(dir=pathlib.Path(__file__).resolve().parents[1]/'.local') as tmp:
   class Handler(m.LocalHandler):
    image_root=pathlib.Path(tmp)
    def log_message(self,*args):pass
   server=m.ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
   host='127.0.0.1:'+str(server.server_port)
   def call(method,path,body=None,headers=None):
    c=http.client.HTTPConnection(host);c.request(method,path,body,headers or {});r=c.getresponse();out=(r.status,r.read());c.close();return out
   headers={'Origin':'http://'+host,'Content-Type':'image/png','X-Sigmyp-Local-Image':'1'}
   buffer=io.BytesIO();Image.new('RGB',(4,4),'red').save(buffer,format='PNG');data=buffer.getvalue()
   key='/__product-images/new_11111111-1111-1111-1111-111111111111.img'
   try:
    self.assertEqual(call('PUT',key,data,{**headers,'Origin':'https://evil.example'})[0],403)
    self.assertEqual(call('PUT',key,b'not an image',headers)[0],400)
    self.assertEqual(call('PUT','/__product-images/../../bad',data,headers)[0],404)
    self.assertEqual(call('PUT',key,data,{**headers,'Content-Length':str(6*1024*1024)})[0],413)
    self.assertEqual(call('PUT',key,data,headers)[0],200)
    self.assertEqual(call('GET',key),(200,data))
    buffer=io.BytesIO();Image.new('RGB',(4,4),'blue').save(buffer,format='PNG');new=buffer.getvalue()
    self.assertEqual(call('PUT',key,new,headers)[0],200)
    self.assertEqual(call('GET',key),(200,new))
    self.assertEqual(next((pathlib.Path(tmp)/'image-history').iterdir()).read_bytes(),data)
   finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__': unittest.main()
