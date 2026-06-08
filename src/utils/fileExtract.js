import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Use local worker from installed package (matches version automatically)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

export async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'pdf')                    return await extractFromPDF(file)
  else if (ext === 'docx' || ext === 'doc') return await extractFromDocx(file)
  else if (ext === 'txt')               return await file.text()
  else if (ext === 'ipynb')             return await extractFromNotebook(file)
  else throw new Error('Unsupported file type. Please upload PDF, DOCX, DOC, TXT, or IPYNB.')
}

async function extractFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText      = ''

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page    = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      // v6 compatible: items have .str property
      const pageText = content.items
        .filter(item => item.str !== undefined)
        .map(item => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }

    if (!fullText.trim()) {
      throw new Error('Could not extract text from PDF. Make sure it is not a scanned image PDF.')
    }
    return fullText
  } catch (err) {
    if (err.message.includes('scanned')) throw err
    throw new Error('Failed to read PDF: ' + err.message)
  }
}

async function extractFromDocx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result      = await mammoth.extractRawText({ arrayBuffer })
    if (!result.value.trim()) {
      throw new Error('Could not extract text from document. The file may be empty or corrupted.')
    }
    return result.value
  } catch (err) {
    if (err.message.includes('extract')) throw err
    throw new Error('Failed to read DOCX: ' + err.message)
  }
}

async function extractFromNotebook(file) {
  try {
    const text = await file.text()
    let nb
    try { nb = JSON.parse(text) } catch { throw new Error('Invalid .ipynb file — could not parse JSON.') }

    const cells = nb.cells || nb.worksheets?.[0]?.cells || []
    if (!cells.length) throw new Error('Notebook has no cells.')

    let out = '=== JUPYTER NOTEBOOK CONTENT ===\n\n'

    cells.forEach((cell, i) => {
      const src = Array.isArray(cell.source)
        ? cell.source.join('')
        : (cell.source || '')
      if (!src.trim()) return

      if (cell.cell_type === 'markdown') {
        const clean = src
          .replace(/#{1,6}\s+/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`{1,3}/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links
          .trim()
        if (clean) out += `[THEORY - Cell ${i+1}]\n${clean}\n\n`

      } else if (cell.cell_type === 'code') {
        out += `[CODE - Cell ${i+1}]\n${src.trim()}\n\n`

        // Include cell outputs (useful for output-based questions)
        const outputs = cell.outputs || []
        outputs.forEach(o => {
          const outText =
            o.text        ? (Array.isArray(o.text) ? o.text.join('') : o.text) :
            o.data?.['text/plain'] ? (Array.isArray(o.data['text/plain']) ? o.data['text/plain'].join('') : o.data['text/plain']) :
            o.evalue      ? `Error: ${o.evalue}` : ''
          if (outText.trim()) out += `[OUTPUT]\n${outText.trim()}\n\n`
        })

      } else if (cell.cell_type === 'raw') {
        out += `[RAW - Cell ${i+1}]\n${src.trim()}\n\n`
      }
    })

    if (out.replace('=== JUPYTER NOTEBOOK CONTENT ===\n\n', '').trim().length < 50) {
      throw new Error('Notebook appears to be empty or has very little content.')
    }

    return out
  } catch (err) {
    if (err.message.includes('empty') || err.message.includes('Invalid') || err.message.includes('parse')) throw err
    throw new Error('Failed to read notebook: ' + err.message)
  }
}