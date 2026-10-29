"""Run on legacy Python 2 host. Read-only, 2026 operations and complete masters.
Credentials, sessions and request logs are deliberately excluded.
"""
import sys,json,datetime,decimal
sys.path.insert(0,'/var/www/sigmyp2')
from config import SQLALCHEMY_DATABASE_URI
from sqlalchemy import create_engine,text
from sqlalchemy.engine.reflection import Inspector
MASTERS=['countries','states','cities','accounts','contacts','offices','providers','provider_contacts','products','items','products_items','products_processes','machines','positions','positions_positions','users','roles','processes','resources','holidays','working_days','response_times','strings','support_solutions']
OPERATIONS={'quotations':'date_created','production_orders':'date_created','bills':'date_created','purchase_orders':'date_created','kardex':'date','supports':'date_created','referrals':'date_created'}
CHILDREN={'quotations_products':('quotations','quotation_id'),'production_orders_products':('production_orders','production_order_id'),'bills_products':('bills','bill_id'),'bills_log':('bills','bill_id'),'bills_receptions':('bills','bill_id'),'purchase_orders_items':('purchase_orders','purchase_order_id'),'serials':('kardex','kardex_id'),'replies':('supports','support_id'),'referrals_products':('referrals','referral_id')}
EXCLUDE={'users':set(['salt','hash']),'machines':set(['password','username','license'])}
def encode(v):
 if isinstance(v,decimal.Decimal):return str(v)
 if isinstance(v,(datetime.datetime,datetime.date,datetime.time)):return v.isoformat()
 if isinstance(v,datetime.timedelta):return {'durationSeconds':str(v.total_seconds())}
 raise TypeError(type(v).__name__)
engine=create_engine(SQLALCHEMY_DATABASE_URI)
result={'source':'sigmyp2','year':2026,'timezone':'America/Bogota','tables':{},'schema':{},'excludedTables':['sessions','log_users','settings','attachments'],'excludedFields':{k:sorted(v) for k,v in EXCLUDE.items()}}
with engine.connect() as c:
 tx=c.begin()
 c.execute(text('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY'))
 inspector=Inspector.from_engine(c)
 for name in MASTERS+sorted(OPERATIONS)+sorted(CHILDREN):
  columns=[col['name'] for col in inspector.get_columns(name) if col['name'] not in EXCLUDE.get(name,set())]
  result['schema'][name]={'primaryKey':inspector.get_primary_keys(name),'foreignKeys':inspector.get_foreign_keys(name)}
  selection='SELECT '+','.join('t."'+col+'"' for col in columns)+' FROM "'+name+'" t'
  kind='master'
  if name in OPERATIONS:
   selection+=' WHERE t."'+OPERATIONS[name]+'" >= :start AND t."'+OPERATIONS[name]+'" < :end'
   kind='operation'
  elif name in CHILDREN:
   parent,fk=CHILDREN[name]
   selection+=' JOIN "'+parent+'" p ON t."'+fk+'"=p.id WHERE p."'+OPERATIONS[parent]+'" >= :start AND p."'+OPERATIONS[parent]+'" < :end'
   kind='detail'
   # Dated events must themselves belong to 2026, in addition to their parent.
   field={'bills_log':'date','bills_receptions':'reception_date','replies':'date_created'}.get(name)
   if field:selection+=' AND t."'+field+'" >= :start AND t."'+field+'" < :end'
  result['tables'][name]={'kind':kind,'rows':[dict(row.items()) for row in c.execute(text(selection),start='2026-01-01T00:00:00-05:00',end='2027-01-01T00:00:00-05:00')]}
 tx.rollback()
print(json.dumps(result,default=encode))
