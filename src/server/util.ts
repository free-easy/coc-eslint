import fastDiff from 'fast-diff'
import { TextDocument, TextEdit } from 'vscode-languageserver'
import { CLIOptions, TextDocumentSettings } from './types'
import URI from 'vscode-uri'

interface Change {
  start: number
  end: number
  newText: string
}

export function getAllFixEdits(textDocument: TextDocument, settings: TextDocumentSettings): TextEdit[] {
  let content = textDocument.getText()
  let newOptions: CLIOptions = Object.assign(
    Object.create(null),
    settings.options
  )
  let u = URI.parse(textDocument.uri)
  if (u.scheme != 'file') return []
  let filename = URI.parse(textDocument.uri).fsPath
  let engine = new settings.library.CLIEngine(newOptions)
  let config = engine.getConfigForFile(filename)
  let linter = new settings.library.Linter()

  let { fixed, output } = linter.verifyAndFix(content, config, {
    fix: true,
    filename,
    allowInlineConfig: true
  })
  if (!fixed) return []
  let change = getChange(content, output)
  return [{
    range: {
      start: textDocument.positionAt(change.start),
      end: textDocument.positionAt(change.end)
    },
    newText: change.newText
  }]
}

export function getChange(oldStr: string, newStr: string): Change {
  let result = fastDiff(oldStr, newStr, 1)
  let curr = 0
  let start = -1
  let end = -1
  let newText = ''
  let remain = ''
  for (let item of result) {
    let [t, str] = item
    // equal
    if (t == 0) {
      curr = curr + str.length
      if (start != -1) remain = remain + str
    } else {
      if (start == -1) start = curr
      if (t == 1) {
        newText = newText + remain + str
        end = curr
      } else {
        newText = newText + remain
        end = curr + str.length
      }
      remain = ''
      if (t == -1) curr = curr + str.length
    }
  }
  return { start, end, newText }
}
