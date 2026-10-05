// Follow the same native disclosure controls as a person browsing the Library.
async function openLibraryBook(page, search = true) {
 for (const id of ['tools-sessions-book', ...(search ? ['tools-library-search-menu'] : [])]) {
  const details = page.locator('#' + id);
  if (!await details.evaluate(element => element.open)) await details.locator(':scope > summary').click();
 }
}
module.exports = {openLibraryBook};
