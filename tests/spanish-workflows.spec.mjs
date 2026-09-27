import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';

test('changing language replaces cached German methodology, caption and publication files',async({page},info)=>{
  await page.goto('/?view=studio&lang=de&template=poll-classic&editor=1');
  await expect(page.locator('.studio-current-preview-image > svg')).toBeVisible();
  await page.getByRole('button',{name:'Info',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'Info',exact:true});
  await dialog.getByText('Quellen, Methode und Vergleichsgrenzen',{exact:true}).click();
  await expect(dialog).toContainText('Befragungszeitraum');
  await dialog.getByRole('button',{name:'Schließen',exact:true}).click();
  await page.getByRole('button',{name:'Einstellungen',exact:true}).click();
  const settings=page.getByRole('dialog',{name:'Einstellungen',exact:true});
  await settings.getByRole('button',{name:'Español España'}).click();
  await page.getByRole('dialog',{name:'Ajustes',exact:true}).getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','es');
  await expect(page.locator('.studio-current-preview-image > svg')).toContainText('Elecciones al Bundestag: última encuesta');
  await page.getByRole('button',{name:'Info',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Info',exact:true});
  await dialog.getByText('Fuentes, método y límites de comparación',{exact:true}).click();
  await expect(dialog).toContainText('Trabajo de campo');
  await expect(dialog).toContainText('Alemania');
  await expect(dialog).not.toContainText('Deutschland');
  await expect(dialog).not.toContainText('Befragungszeitraum');
  await expect(dialog).not.toContainText('Die Werte');
  const pending=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Descargar paquete de publicación',exact:true}).click();
  const download=await pending;
  const files=unzipSync(await readFile(await download.path()));
  expect(strFromU8(files['README.txt'])).toContain('Registro de publicación');
  expect(strFromU8(files['caption.txt'])).toContain('Alemania');
  expect(strFromU8(files['sources.txt'])).toContain('Trabajo de campo');
  expect(strFromU8(files['sources.txt'])).not.toContain('Befragungszeitraum');
  expect(JSON.parse(strFromU8(files['settings.json'])).settings.lang).toBe('es');
  expect(files['graphic.png'].slice(0,8)).toEqual(new Uint8Array([137,80,78,71,13,10,26,10]));
  await download.saveAs(info.outputPath('spanish-publication.zip'));
  await page.screenshot({path:info.outputPath('spanish-source-panel.png')});
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:'Insertar',exact:true}).click();
  const share=page.locator('.widget-share-modal');
  await expect(share).toContainText('Compartir e insertar');
  const code=await share.locator('.code-label code').textContent();
  const src=code.match(/src="([^"]+)"/)[1].replaceAll('&amp;','&');
  expect(new URL(src).searchParams.get('lang')).toBe('es');
  // Keep the review local, even when the copied publication URL is canonical.
  const url=new URL(src);
  await page.goto(url.pathname+url.search);
  await expect(page.locator('svg').first()).toContainText('Elecciones al Bundestag: última encuesta');
});

test('Spanish account form and errors never fall back to hard-coded German',async({page},info)=>{
  await page.route('**/api/account/capabilities',r=>r.fulfill({json:{enabled:true,localOnly:false}}));
  await page.route('**/api/auth/get-session',r=>r.fulfill({json:null}));
  await page.route('**/api/auth/sign-in/email',r=>r.fulfill({status:401,json:{message:'Invalid email or password'}}));
  await page.goto('/?lang=es');
  await page.getByRole('button',{name:'Cuenta',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Tu cuenta de Pollframe'});
  await dialog.getByLabel('Correo electrónico',{exact:true}).fill('reader@example.test');
  await dialog.getByLabel('Contraseña',{exact:true}).fill('A test password not submitted externally');
  await dialog.locator('form').getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(dialog.getByRole('status')).toHaveText('Correo o contraseña incorrectos');
  await dialog.getByRole('button',{name:'Registrarse',exact:true}).click();
  await expect(dialog.getByLabel('Nombre público')).toBeVisible();
  await expect(dialog).toContainText('Al menos 15 caracteres');
  await expect(dialog).not.toContainText('Passwort');
  const box=await dialog.boundingBox(),viewport=page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);
  expect(box.height).toBeLessThanOrEqual(viewport.height*.76);
  await page.screenshot({path:info.outputPath('spanish-account.png')});
});

test('Spanish legal and privacy pages retain all sections and original contact links',async({page})=>{
  await page.goto('/?page=impressum&lang=es');
  await expect(page.getByRole('heading',{name:'Aviso legal',exact:true})).toBeVisible();
  const email=await page.locator('main a[href^="mailto:"]').getAttribute('href');
  await expect(page.locator('main')).toContainText('Responsable del contenido periodístico');
  await page.goto('/?page=datenschutz&lang=es');
  await expect(page.getByRole('heading',{name:'Política de privacidad',exact:true})).toBeVisible();
  await expect(page.locator('main section')).toHaveCount(10);
  await expect(page.locator('main a[href^="mailto:"]')).toHaveAttribute('href',email);
  await expect(page.locator('main')).toContainText('400 días');
  await expect(page.locator('main')).not.toContainText('Privacy notice');
  await expect(page.locator('main a[href*="analytics=off"]')).toBeVisible();
});

test('Spanish history and editor event controls use the translated catalogue',async({page},info)=>{
  await page.goto('/?region=bundestag&lang=es');
  await expect(page.getByRole('heading',{name:'Evolución de la intención de voto en Alemania',exact:true})).toBeVisible();
  await expect(page.locator('.chart-region')).toContainText('Invasión de Ucrania');
  await page.goto('/?view=studio&template=history-original&lang=es&editor=1&workspace=edit&range=five');
  await expect(page.locator('.studio-current-preview-image > svg')).toContainText('Invasión de Ucrania');
  if(await page.locator('.studio-inspector-panel').count()) {
    await page.locator('.studio-inspector-panel').getByRole('button',{name:'Acontecimientos',exact:true}).click();
    await expect(page.locator('.studio-inspector-panel')).toContainText('Generar');
  }
  await page.screenshot({path:info.outputPath('spanish-history.png')});
});
