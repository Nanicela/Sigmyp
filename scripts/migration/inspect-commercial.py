"""Read a private source export and report migration blockers without changing data."""
import argparse, collections, json, re
from pathlib import Path

def inspect(source):
    masters = source['masters']
    accounts = {row['id']: row for row in masters['accounts']}
    contacts = {row['id']: row for row in masters['contacts']}
    issues = []
    identities = collections.defaultdict(list)
    for row in accounts.values():
        nit = str(row.get('nit') or '').strip()
        key = re.sub(r'[.\s]', '', nit)
        if not key:
            issues.append({'table': 'accounts', 'id': row['id'], 'reason': 'missing_identification'})
        else:
            identities[key].append(row['id'])
        if not row.get('name'):
            issues.append({'table': 'accounts', 'id': row['id'], 'reason': 'missing_name'})
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', str(row.get('email') or '')):
            issues.append({'table': 'accounts', 'id': row['id'], 'reason': 'email_requires_review'})
    for ids in identities.values():
        if len(ids) > 1:
            issues.append({'table': 'accounts', 'ids': ids, 'reason': 'duplicate_source_identification'})
    for row in contacts.values():
        if row.get('account_id') not in accounts:
            issues.append({'table': 'contacts', 'id': row['id'], 'reason': 'missing_account_reference'})
    resolved = []
    for row in masters['offices']:
        contact = contacts.get(row.get('contact_id'))
        account_id = contact.get('account_id') if contact else None
        if account_id not in accounts:
            issues.append({'table': 'offices', 'id': row['id'], 'reason': 'unresolved_customer_via_contact'})
        else:
            resolved.append({'sourceOfficeId': row['id'], 'sourceContactId': contact['id'], 'sourceAccountId': account_id})
    return {'mode': 'dry-run', 'writes': 0, 'operationYear': 2026,
            'masterCounts': {name: len(rows) for name, rows in masters.items()},
            'operationCounts': source.get('operations2026', {}),
            'issueCounts': dict(collections.Counter(issue['reason'] for issue in issues)),
            'issues': issues, 'resolvedSiteRelations': resolved,
            'notes': ['Source identities are not assumed to be NIT or CC.',
                      'Tax responsibilities absent in source must not be invented.',
                      'Compare against destination before creating records.']}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('report', type=Path)
    args = parser.parse_args()
    report = inspect(json.loads(args.source.read_text()))
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    args.report.chmod(0o600)
    print(json.dumps({k: report[k] for k in ['mode', 'writes', 'masterCounts', 'issueCounts']}))
