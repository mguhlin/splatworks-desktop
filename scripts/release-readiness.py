#!/usr/bin/env python3
"""Report stable-release configuration without reading or printing secret values."""
import argparse,json,subprocess,sys


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scope',choices=['desktop','standalone','all'],default='all')
    parser.add_argument('--json',action='store_true')
    args=parser.parse_args()
    def gh(resource):
        return json.loads(subprocess.check_output(['gh','api',resource],text=True))
    repository=json.loads(subprocess.check_output(['gh','repo','view','--json','nameWithOwner'],text=True))['nameWithOwner']
    variables={v['name']:v['value'] for v in gh('repos/'+repository+'/actions/variables?per_page=100')['variables']}
    secrets={s['name'] for s in gh('repos/'+repository+'/actions/secrets?per_page=100')['secrets']}
    checks={}
    if args.scope in ['desktop','all']:
        checks['desktopPhysicalValidation']=variables.get('PHYSICAL_VALIDATION_APPROVED')=='true'
    if args.scope in ['standalone','all']:
        checks['standalonePhysicalValidation']=variables.get('STANDALONE_PHYSICAL_VALIDATION_APPROVED')=='true'
    required_variables=['MACOS_SIGNING_IDENTITY','APPLE_API_KEY_ID','APPLE_API_ISSUER_ID']
    required_secrets=['MACOS_CERTIFICATE_P12','MACOS_CERTIFICATE_PASSWORD','APPLE_API_KEY_P8']
    if variables.get('WINDOWS_SIGNING_PROVIDER','azure')=='pfx':
        if not variables.get('WINDOWS_CERTIFICATE_THUMBPRINT'):
            required_secrets+=['WINDOWS_CERTIFICATE_PFX','WINDOWS_CERTIFICATE_PASSWORD']
    else:
        required_variables+=['AZURE_CLIENT_ID','AZURE_TENANT_ID','AZURE_SUBSCRIPTION_ID','AZURE_SIGNING_ENDPOINT','AZURE_SIGNING_ACCOUNT','AZURE_SIGNING_PROFILE']
    missing_variables=[name for name in required_variables if not variables.get(name)]
    missing_secrets=[name for name in required_secrets if name not in secrets]
    checks['signingConfigurationPresent']=not missing_variables and not missing_secrets
    report={'repository':repository,'scope':args.scope,'configurationReady':all(checks.values()),'checks':checks,'missingVariables':missing_variables,'missingSecrets':missing_secrets,
            'note':'Configuration presence does not validate certificates or hardware. Run signed candidates and record physical-device results before a stable tag.'}
    if args.json:print(json.dumps(report,indent=2))
    else:
        print('Stable-release configuration: '+('complete' if report['configurationReady'] else 'incomplete'))
        for name,passed in checks.items():print(('PASS ' if passed else 'NEEDED ')+name)
        if missing_variables:print('Missing repository variables: '+', '.join(missing_variables))
        if missing_secrets:print('Missing GitHub secrets: '+', '.join(missing_secrets))
        print(report['note'])
    return 0 if report['configurationReady'] else 1


if __name__=='__main__':
    try:sys.exit(main())
    except subprocess.CalledProcessError:sys.exit('Could not read release configuration. Authenticate gh with repository settings access.')
