import AMDCompiler from './amd_compiler'
import CJSCompiler from './cjs_compiler'
import GlobalsCompiler from './globals_compiler'
import { Unique } from './utils'

EXPORT = /^\s*export\s+(.*?)\s*(;)?\s*$/
EXPORT_DEFAULT = /^\s*export\s*default\s*(.*?)\s*(;)?\s*$/
EXPORT_FUNCTION = /^\s*export\s+function\s+(\w+)\s*(\(.*)$/
EXPORT_VAR = /^\s*export\s+var\s+(\w+)\s*=\s*(.*)$/

IMPORT = /^\s*import\s+(.*)\s+from\s+(?:"([^"]+?)"|'([^']+?)')\s*(;)?\s*$/
IMPORT_AS = /^\s*(.*)\s+as\s+(.*)\s*$/

RE_EXPORT = /^export\s+({.*})\s+from\s+(?:"([^"]+?)"|'([^']+?)')\s*(;)?\s*$/

COMMENT_START = new RegExp("/\\*")
COMMENT_END = new RegExp("\\*/")

# naively-handled block comments: only look for ### at start of line
# avoids having to track state, since would want to avoid entering comment
# state on ### in other comments (like this one) and in strings
COMMENT_CS_TOGGLE = /^###/

getNames = (string) ->
  if string[0] is '{' and string[string.length-1] is '}'
    name.trim() for name in string[1...-1].split(',')
  else
    [string.trim()]

class Compiler
  constructor: (string, moduleName=null, options={}) ->
    @string = string
    @moduleName = moduleName
    @options = options

    @imports = {}
    @importDefault = {}
    @exports = {}
    @exportDefault = null
    @lines = []
    @id = 0

    @inBlockComment = false
    @reExportUnique = new Unique('reexport')

    if not @options.coffee
      @commentStart = COMMENT_START
      @commentEnd = COMMENT_END
    else
      @commentStart = COMMENT_CS_TOGGLE
      @commentEnd = COMMENT_CS_TOGGLE

    @parse()

  parse: ->
    eol = @options.eol or '\n'
    @log eol, 'SPLITTING BY', encodeURIComponent(eol)
    @parseLine line for line in @string.split(eol)
    return null

  parseLine: (line) ->
    if not @inBlockComment
      if match = @matchLine line, EXPORT_DEFAULT
        @log 1, line, match
        @processExportDefault match
      else if match = @matchLine line, EXPORT_FUNCTION
        @log 2, line, match
        @processExportFunction match
      else if match = @matchLine line, EXPORT_VAR
        @log 3, line, match
        @processExportVar match
      else if match = @matchLine line, RE_EXPORT
        @log 4, line, match
        @processReexport match
      else if match = @matchLine line, EXPORT
        @log 5, line, match
        @processExport match
      else if match = @matchLine line, IMPORT
        @log 6, line, match
        @processImport match
      else if match = @matchLine line, @commentStart
        # @log 7, line, match
        @processEnterComment line
      else
        # @log 8, line, ''
        @processLine line
    else
      if match = @matchLine line, @commentEnd
        @log 9, line, match
        @processExitComment line
      else
        @log 0, line, ''
        @processLine line

  log: (a, b, c) ->
    # console.log a, b, c
    null

  matchLine: (line, pattern) ->
    match = line.match pattern

    # if not CoffeeScript then we need the semi-colon
    if match and not @options.coffee and not match[match.length-1]
      return null

    return match

  processExportDefault: (match) ->
    @exportDefault = match[1]

  processExport: (match) ->
    @exports[ex] = ex for ex in getNames(match[1])

  processExportFunction: (match) ->
    name = match[1]
    body = match[2]

    @lines.push "function #{name}#{body}"
    @exports[name] = name

  processExportVar: (match) ->
    name = match[1]
    value = match[2]

    @lines.push "var #{name} = #{value}"
    @exports[name] = name

  processImport: (match) ->
    pattern = match[1]

    if pattern[0] is '{' and pattern[pattern.length-1] is '}'
      pattern = pattern[1...-1]
      importSpecifiers = (name.trim() for name in pattern.split(/\s*,\s*/))

      imports = {}
      for name in importSpecifiers
        if asMatch = name.match IMPORT_AS
          imports[asMatch[1]] = asMatch[2]
        else
          imports[name] = name
      @imports[match[2] or match[3]] = imports
    else
      @importDefault[match[2] or match[3]] = match[1]

  processReexport: (match) ->
    names       = getNames(match[1])
    importPath  = match[2] or match[3]
    importLocal = @reExportUnique.next()

    @importDefault[importPath] = importLocal
    @exports[name] = "#{importLocal}.#{name}" for name in names

  processLine: (line) ->
    @lines.push line

  processEnterComment: (line) ->
    if not @matchLine line, COMMENT_END
      @inBlockComment = true
    @lines.push line

  processExitComment: (line) ->
    @inBlockComment = false
    @lines.push line

  toAMD: ->
    new AMDCompiler(this, @options).stringify()

  toCJS: ->
    new CJSCompiler(this, @options).stringify()

  toGlobals: ->
    new GlobalsCompiler(this, @options).stringify()

export default Compiler
