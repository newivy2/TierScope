// Exercise native disclosures through their visible summaries.
async function revealControl(page, selector) {
 const control=page.locator(selector).first();
 const ancestors=await control.evaluate(element=>{const ids=[];let parent=element.parentElement;while(parent){if(parent.tagName==='DETAILS'&&parent.id)ids.unshift(parent.id);parent=parent.parentElement;}return ids;});
 for(const id of ancestors){const details=page.locator('#'+id);if(!await details.evaluate(element=>element.open))await details.locator(':scope > summary').click();}
}
async function clickControl(page, selector) {await revealControl(page,selector);await page.click(selector);}
async function openAnalysis(page, name) {await clickControl(page,'[data-tools-tab='+name+']');}
async function openLibraryBook(page, search = true) {
 for(const id of ['tools-sessions-book',...(search?['tools-library-search-menu']:[]),'tools-model-browser','tools-live-shortcuts']) {
  const details=page.locator('#'+id);if(await details.count()&&!await details.evaluate(element=>element.open))await details.locator(':scope > summary').click();
 }
}
module.exports={openLibraryBook,openAnalysis,clickControl,revealControl};
