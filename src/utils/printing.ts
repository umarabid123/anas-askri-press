export function printDocument(id: string, paper: 'A4' | '80mm' | '58mm' = 'A4') {
  const target = document.getElementById(id)
  if (!target) throw new Error('Document is not ready for printing.')
  const style = document.createElement('style')
  // Zero page margin stops the browser printing its date/title/URL headers;
  // spacing from the paper edge comes from body padding instead.
  style.textContent = `@page { size: ${paper === 'A4' ? 'A4' : `${paper} auto`}; margin: 0; }
    body.printing-document { padding: ${paper === 'A4' ? '10mm' : '2mm'} !important; box-decoration-break: clone; -webkit-box-decoration-break: clone; }`
  target.classList.add('active-print-document')
  document.body.classList.add('printing-document')
  document.head.appendChild(style)
  const cleanup = () => { target.classList.remove('active-print-document'); document.body.classList.remove('printing-document'); style.remove(); window.removeEventListener('afterprint', cleanup) }
  window.addEventListener('afterprint', cleanup)
  try { window.print() } catch (error) { cleanup(); throw error }
}
