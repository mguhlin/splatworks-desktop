const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
  testDir:'./tests',timeout:120000,workers:2,
  use:{baseURL:'http://127.0.0.1:4194',headless:true},
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer:[{command:'python3 -m http.server 4194 --bind 127.0.0.1 --directory frontend',url:'http://127.0.0.1:4194',reuseExistingServer:!process.env.CI},{command:'python3 -m http.server 4195 --bind 127.0.0.1 --directory '+(process.env.SPLAT_BROWSER_SOURCE||'../drawsplat_github'),url:'http://127.0.0.1:4195',reuseExistingServer:!process.env.CI}],
});
