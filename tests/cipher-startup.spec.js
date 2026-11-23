const {test,expect}=require('@playwright/test');

test('CipherSplat waits for its input handlers before accepting early typing',async({page})=>{
 let release,arrived;
 const held=new Promise(resolve=>{release=resolve}),requested=new Promise(resolve=>{arrived=resolve});
 await page.route('**/solutions/CipherSplat/browser.js',async route=>{arrived();await held;await route.continue();});
 await page.goto('/#ciphersplat',{waitUntil:'domcontentloaded'});await requested;
 const frame=page.frameLocator('#tool-ciphersplat');
 await expect(frame.locator('html')).toHaveJSProperty('inert',true);
 expect(await frame.locator('#textInput').evaluate(input=>{input.focus();return input.ownerDocument.activeElement===input;})).toBe(false);
 release();
 await expect(frame.locator('html')).toHaveJSProperty('inert',false);
 await frame.locator('#textInput').fill('A note entered after startup');
 await frame.locator('#password').fill('Synthetic startup password');
 await expect(frame.locator('#runButton')).toBeEnabled();
 await expect(frame.locator('#runLabel')).toHaveText('Encrypt text');
});
