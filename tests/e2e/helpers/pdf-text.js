async function extractPdfText(page, pdfBytes) {
  await page.addScriptTag({ url: '/assets/pdf.min.js' });
  const base64 = Buffer.from(pdfBytes).toString('base64');
  return page.evaluate(async ({ base64, workerSrc }) => {
    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) data[index] = binary.charCodeAt(index);

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    const documentTask = window.pdfjsLib.getDocument({ data });
    const pdf = await documentTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const pdfPage = await pdf.getPage(pageNumber);
      const content = await pdfPage.getTextContent();
      pages.push(content.items.map(item => item.str).join(' '));
    }
    await pdf.destroy();
    return pages;
  }, {
    base64,
    workerSrc: new URL('/assets/pdf.worker.min.js', page.url()).href
  });
}

module.exports = { extractPdfText };